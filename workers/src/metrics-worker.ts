import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from './lib/supabase'

const ENSEMBLE_API_URL = process.env.ENSEMBLE_API_URL ?? 'https://ensembledata.com/apis'
const ENSEMBLE_API_KEY = process.env.ENSEMBLE_API_KEY!
if (!ENSEMBLE_API_KEY) throw new Error('Missing ENSEMBLE_API_KEY')

interface NormalizedMetrics {
  views: number
  likes: number
  comments: number
  shares: number
  saves: number
  follower_count: number
  engagement_rate: number
}

async function fetchMetrics(
  platform: string,
  platformPostId: string,
  postUrl: string
): Promise<NormalizedMetrics | null> {
  try {
    if (platform === 'tiktok') {
      const res = await fetch(
        `${ENSEMBLE_API_URL}/tt/post/info?url=${encodeURIComponent(postUrl)}&token=${ENSEMBLE_API_KEY}`
      )
      if (!res.ok) return null
      const json = await res.json() as { data?: Record<string, unknown> | Record<string, unknown>[] }
      const item = Array.isArray(json.data) ? json.data[0] : json.data
      const stats = item?.statistics as Record<string, number> | undefined
      const author = item?.author as Record<string, unknown> | undefined
      if (!stats) return null
      const views = stats.play_count ?? 0
      const likes = stats.digg_count ?? 0
      const comments = stats.comment_count ?? 0
      const shares = stats.share_count ?? 0
      let followerCount = (author?.follower_count as number | undefined) ?? 0
      if (followerCount === 0) {
        const uniqueId = author?.unique_id as string | undefined
        if (uniqueId) {
          try {
            const userRes = await fetch(
              `${ENSEMBLE_API_URL}/tt/user/info?username=${encodeURIComponent(uniqueId)}&token=${ENSEMBLE_API_KEY}`
            )
            if (userRes.ok) {
              const userJson = await userRes.json() as { data?: { stats?: { followerCount?: number } } }
              const fc = userJson.data?.stats?.followerCount
              if (typeof fc === 'number' && fc > 0) followerCount = fc
            }
          } catch { /* fall back to 0 */ }
        }
      }
      const engagementRate = views > 0 ? ((likes + comments + shares) / views) * 100 : 0
      return { views, likes, comments, shares, saves: 0, follower_count: followerCount, engagement_rate: Math.round(engagementRate * 10000) / 10000 }
    }

    if (platform === 'instagram') {
      const res = await fetch(
        `${ENSEMBLE_API_URL}/instagram/post/details?code=${encodeURIComponent(platformPostId)}&token=${ENSEMBLE_API_KEY}`
      )
      if (!res.ok) return null
      const json = await res.json() as { data?: Record<string, unknown> }
      const data = json.data
      if (!data) return null

      // Likes: top-level field first, then nested edge objects used by older scraper responses
      const likeEdge = (data.edge_media_preview_like ?? data.edge_liked_by) as Record<string, unknown> | undefined
      const likes = (data.like_count as number | undefined)
        ?? (likeEdge?.count as number | undefined)
        ?? 0

      // Comments: top-level first, then nested edge objects
      const commentEdge = (data.edge_media_to_comment ?? data.edge_media_preview_comment) as Record<string, unknown> | undefined
      const comments = (data.comment_count as number | undefined)
        ?? (commentEdge?.count as number | undefined)
        ?? 0

      const views = (data.view_count ?? data.play_count ?? data.video_view_count ?? data.video_play_count) as number | undefined ?? 0
      const saves = (data.save_count as number | undefined) ?? 0

      // Follower count: try top-level, then owner sub-object, then separate user/info call
      const owner = data.owner as Record<string, unknown> | undefined
      let followerCount = (data.owner_follower_count ?? data.follower_count) as number | undefined ?? 0
      if (followerCount === 0) {
        followerCount = (owner?.followed_by_count ?? owner?.follower_count) as number | undefined ?? 0
      }
      if (followerCount === 0) {
        const username = owner?.username as string | undefined
        if (username) {
          try {
            const userRes = await fetch(
              `${ENSEMBLE_API_URL}/instagram/user/info?username=${encodeURIComponent(username)}&token=${ENSEMBLE_API_KEY}`
            )
            if (userRes.ok) {
              const userJson = await userRes.json() as { data?: Record<string, unknown> }
              const followedByEdge = userJson.data?.edge_followed_by as Record<string, unknown> | undefined
              const fc = (userJson.data?.follower_count as number | undefined)
                ?? (followedByEdge?.count as number | undefined)
              if (typeof fc === 'number' && fc > 0) followerCount = fc
            }
          } catch { /* fall back to 0 */ }
        }
      }

      const reach = views > 0 ? views : likes
      const engagementRate = reach > 0 ? ((likes + comments + saves) / reach) * 100 : 0
      return { views, likes, comments, shares: 0, saves, follower_count: followerCount, engagement_rate: Math.round(engagementRate * 10000) / 10000 }
    }

    if (platform === 'youtube') {
      const res = await fetch(
        `${ENSEMBLE_API_URL}/yt/video/details?id=${encodeURIComponent(platformPostId)}&token=${ENSEMBLE_API_KEY}`
      )
      if (!res.ok) return null
      const json = await res.json() as { data?: Record<string, unknown> }
      const data = json.data
      if (!data) return null
      const views = (data.view_count as number | undefined) ?? 0
      const likes = (data.like_count as number | undefined) ?? 0
      const comments = (data.comment_count as number | undefined) ?? 0
      const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0
      return { views, likes, comments, shares: 0, saves: 0, follower_count: 0, engagement_rate: Math.round(engagementRate * 10000) / 10000 }
    }

    return null
  } catch {
    return null
  }
}

async function processJob(
  supabase: SupabaseClient,
  job: { id: string; post_id: string; attempts: number }
) {
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, platform_post_id, platform, post_url, workspace_id')
    .eq('id', job.post_id)
    .single()

  if (postError || !post) {
    throw new Error(`Post not found: ${job.post_id}`)
  }

  try {
    const metrics = await fetchMetrics(post.platform, post.platform_post_id, post.post_url)

    if (!metrics) {
      throw new Error(`Failed to fetch metrics for ${post.platform} post ${post.platform_post_id}`)
    }

    const { data: emvConfig } = await supabase
      .from('emv_config')
      .select('cpm_rate')
      .eq('workspace_id', post.workspace_id)
      .eq('platform', post.platform)
      .single()

    const cpmRate = emvConfig?.cpm_rate ?? 5.0
    const emv = metrics.views * (cpmRate / 1000)

    const { error: insertError } = await supabase.from('post_metrics').insert({
      post_id: post.id,
      workspace_id: post.workspace_id,
      views: metrics.views,
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      saves: metrics.saves,
      follower_count: metrics.follower_count,
      engagement_rate: metrics.engagement_rate,
      emv,
      emv_cpm_used: cpmRate,
    })

    if (insertError) {
      throw new Error(`Failed to insert metrics: ${insertError.message}`)
    }

    await supabase
      .from('posts')
      .update({ metrics_fetched_at: new Date().toISOString() })
      .eq('id', job.post_id)

    await supabase
      .from('retry_queue')
      .update({ status: 'done', processed_at: new Date().toISOString() })
      .eq('id', job.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    if (job.attempts >= 3) {
      await supabase
        .from('retry_queue')
        .update({
          status: 'failed',
          error: message,
          processed_at: new Date().toISOString(),
        })
        .eq('id', job.id)
    } else {
      const scheduledAt = new Date(
        Date.now() + job.attempts * 15 * 60 * 1000
      ).toISOString()

      await supabase
        .from('retry_queue')
        .update({
          status: 'pending',
          error: message,
          scheduled_at: scheduledAt,
        })
        .eq('id', job.id)
    }

    throw err
  }
}

async function main() {
  const supabase = createServiceClient()

  const { data: jobs, error: claimError } = await supabase.rpc('claim_jobs', {
    p_job_type: 'metrics_fetch',
    p_limit: 10,
  })

  if (claimError) {
    console.error('[metrics-worker] Failed to claim jobs:', claimError)
    process.exit(1)
  }

  if (!jobs || jobs.length === 0) {
    console.log(JSON.stringify({ processed: 0 }))
    process.exit(0)
  }

  const results = await Promise.allSettled(
    jobs.map((job: { id: string; post_id: string; attempts: number }) =>
      processJob(supabase, job)
    )
  )

  const succeeded = results.filter((r: PromiseSettledResult<unknown>) => r.status === 'fulfilled').length
  const failed = results.filter((r: PromiseSettledResult<unknown>) => r.status === 'rejected').length

  console.log(JSON.stringify({ processed: jobs.length, succeeded, failed }))
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
