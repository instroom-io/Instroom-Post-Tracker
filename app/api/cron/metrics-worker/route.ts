import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 300

const ENSEMBLE_API_URL = process.env.ENSEMBLE_API_URL ?? 'https://ensembledata.com/apis'
const ENSEMBLE_API_KEY = process.env.ENSEMBLE_API_KEY!

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
      const followerCount = (author?.follower_count as number | undefined) ?? 0
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
      const likes = (data.like_count as number | undefined) ?? 0
      const comments = (data.comment_count as number | undefined) ?? 0
      const views = (data.view_count ?? data.play_count ?? data.video_view_count) as number | undefined ?? 0
      const saves = (data.save_count as number | undefined) ?? 0
      const followerCount = (data.owner_follower_count ?? data.follower_count) as number | undefined ?? 0
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
      // follower_count not available from per-video endpoint
      return { views, likes, comments, shares: 0, saves: 0, follower_count: 0, engagement_rate: Math.round(engagementRate * 10000) / 10000 }
    }

    return null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createServiceClient()

  // Claim up to 10 pending metrics jobs
  const { data: jobs, error: claimError } = await supabase.rpc('claim_jobs', {
    p_job_type: 'metrics_fetch',
    p_limit: 10,
  })

  if (claimError) {
    console.error('[metrics-worker] Failed to claim jobs:', claimError)
    return NextResponse.json({ error: claimError.message }, { status: 500 })
  }

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  const results = await Promise.allSettled(
    jobs.map((job: { id: string; post_id: string; attempts: number }) =>
      processJob(supabase, job)
    )
  )

  const succeeded = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length

  return NextResponse.json({ processed: jobs.length, succeeded, failed })
}

async function processJob(
  supabase: ReturnType<typeof createServiceClient>,
  job: { id: string; post_id: string; attempts: number }
) {
  // Load post context
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, platform_post_id, platform, post_url, workspace_id')
    .eq('id', job.post_id)
    .single()

  if (postError || !post) {
    throw new Error(`Post not found: ${job.post_id}`)
  }

  try {
    // Fetch metrics via platform-specific EnsembleData endpoints
    const metrics = await fetchMetrics(post.platform, post.platform_post_id, post.post_url)

    if (!metrics) {
      throw new Error(`Failed to fetch metrics for ${post.platform} post ${post.platform_post_id}`)
    }

    // Fetch CPM config for this workspace + platform
    const { data: emvConfig } = await supabase
      .from('emv_config')
      .select('cpm_rate')
      .eq('workspace_id', post.workspace_id)
      .eq('platform', post.platform)
      .single()

    const cpmRate = emvConfig?.cpm_rate ?? 5.0
    const emv = metrics.views * (cpmRate / 1000)

    // Write post_metrics (immutable — no ON CONFLICT)
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

    // Mark post as fetched
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
