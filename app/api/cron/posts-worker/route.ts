import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const ENSEMBLE_API_URL = process.env.ENSEMBLE_API_URL ?? 'https://ensembledata.com/apis'
const ENSEMBLE_API_KEY = process.env.ENSEMBLE_API_KEY!

// ─── Types ─────────────────────────────────────────────────────────────────────

interface NormalizedPost {
  ensemble_post_id: string
  post_url: string
  caption: string | null
  thumbnail_url: string | null
  posted_at: string // ISO 8601
}

interface ScrapeResult {
  posts: NormalizedPost[]
  resolvedId: string | null // IG: instagram_user_id | TT: tiktok_sec_uid | YT: youtube_channel_id
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true if caption matches any hashtag or mention in the config.
 *  Returns true unconditionally if both arrays are empty (no filter configured). */
function matchesTrackingConfig(
  caption: string | null,
  hashtags: string[],
  mentions: string[]
): boolean {
  // No filter configured — include all posts from this influencer
  if (hashtags.length === 0 && mentions.length === 0) return true
  if (!caption) return false
  const lower = caption.toLowerCase()
  return (
    hashtags.some((h) => lower.includes(`#${h.replace(/^#/, '').toLowerCase()}`)) ||
    mentions.some((m) => lower.includes(`@${m.replace(/^@/, '').toLowerCase()}`))
  )
}

function isWithinCampaignWindow(postedAt: string, startDate: string, endDate: string): boolean {
  const posted = new Date(postedAt).getTime()
  const start = new Date(startDate).getTime()
  const end = new Date(`${endDate}T23:59:59Z`).getTime()
  return posted >= start && posted <= end
}

// ─── Platform scrapers ─────────────────────────────────────────────────────────

/** Parse a single Instagram item (post or reel) into a NormalizedPost.
 *  urlType controls the URL path used: 'p' for feed posts, 'reel' for Reels. */
function parseIgItem(
  p: Record<string, unknown>,
  urlType: 'p' | 'reel'
): NormalizedPost | null {
  // Prefer explicit shortcode field; fall back to URL extraction supporting /p/, /reel/, /tv/
  let shortcode = (p.shortcode ?? p.code) as string | undefined
  if (!shortcode) {
    const url = (p.url ?? p.permalink ?? p.link) as string | undefined
    const match = url?.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/)
    shortcode = match?.[2]
  }
  if (!shortcode) return null

  const takenAt = p.taken_at_timestamp ?? p.taken_at ?? p.timestamp
  if (!takenAt) return null
  const postedAt = new Date(
    typeof takenAt === 'number' ? takenAt * 1000 : String(takenAt)
  ).toISOString()

  const captionRaw = p.caption
  const caption =
    typeof captionRaw === 'string'
      ? captionRaw
      : typeof captionRaw === 'object' && captionRaw !== null
        ? ((captionRaw as Record<string, unknown>).text as string | undefined) ?? null
        : null

  return {
    ensemble_post_id: shortcode,
    post_url: `https://www.instagram.com/${urlType}/${shortcode}/`,
    caption,
    thumbnail_url: (p.thumbnail_url ?? p.display_url) as string | null ?? null,
    posted_at: postedAt,
  }
}

async function scrapeInstagram(handle: string, cachedUserId?: string | null): Promise<ScrapeResult> {
  let userId: string | null = cachedUserId ?? null

  // Resolve numeric user_id from handle if not cached
  if (!userId) {
    const infoRes = await fetch(
      `${ENSEMBLE_API_URL}/instagram/user/info?username=${encodeURIComponent(handle)}&token=${ENSEMBLE_API_KEY}`
    )
    if (!infoRes.ok) {
      console.error(`[posts-worker] IG user/info failed for @${handle}: ${infoRes.status}`)
      return { posts: [], resolvedId: null }
    }
    const infoJson = await infoRes.json() as { data?: Record<string, unknown> }
    const raw = infoJson.data?.id ?? infoJson.data?.pk ?? infoJson.data?.user_id
    userId = raw ? String(raw) : null
    if (!userId) {
      console.error(`[posts-worker] Could not resolve IG user_id for @${handle}`)
      return { posts: [], resolvedId: null }
    }
  }

  // Fetch regular posts and Reels in parallel — Reels are a separate EnsembleData endpoint
  const [postsRes, reelsRes] = await Promise.all([
    fetch(`${ENSEMBLE_API_URL}/instagram/user/posts?user_id=${encodeURIComponent(userId)}&token=${ENSEMBLE_API_KEY}`),
    fetch(`${ENSEMBLE_API_URL}/ig/user/reels?user_id=${encodeURIComponent(userId)}&token=${ENSEMBLE_API_KEY}`),
  ])

  const seenShortcodes = new Set<string>()
  const posts: NormalizedPost[] = []

  if (postsRes.ok) {
    const postsJson = await postsRes.json() as { data?: unknown[] }
    if (Array.isArray(postsJson.data)) {
      for (const item of postsJson.data) {
        const normalized = parseIgItem(item as Record<string, unknown>, 'p')
        if (normalized && !seenShortcodes.has(normalized.ensemble_post_id)) {
          seenShortcodes.add(normalized.ensemble_post_id)
          posts.push(normalized)
        }
      }
    }
  } else {
    console.error(`[posts-worker] IG user/posts failed for @${handle}: ${postsRes.status}`)
  }

  if (reelsRes.ok) {
    const reelsJson = await reelsRes.json() as { data?: unknown[] }
    if (Array.isArray(reelsJson.data)) {
      for (const item of reelsJson.data) {
        const normalized = parseIgItem(item as Record<string, unknown>, 'reel')
        if (normalized && !seenShortcodes.has(normalized.ensemble_post_id)) {
          seenShortcodes.add(normalized.ensemble_post_id)
          posts.push(normalized)
        }
      }
    }
  } else {
    console.error(`[posts-worker] IG user/reels failed for @${handle}: ${reelsRes.status}`)
  }

  return { posts, resolvedId: userId }
}

async function scrapeTikTok(handle: string, depth = 1): Promise<ScrapeResult> {
  // EnsembleData /tt/user/posts only accepts username — secUid is extracted from response data only
  const url = `${ENSEMBLE_API_URL}/tt/user/posts?username=${encodeURIComponent(handle)}&depth=${depth}&token=${ENSEMBLE_API_KEY}`

  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    console.error(`[posts-worker] TT user/posts failed for @${handle}: ${res.status}`)
    return { posts: [], resolvedId: null }
  }
  const json = await res.json() as { data?: unknown[] }
  if (!Array.isArray(json.data)) return { posts: [], resolvedId: null }

  const posts: NormalizedPost[] = []

  for (const item of json.data) {
    const p = item as Record<string, unknown>
    const awemeId = p.aweme_id as string | undefined
    if (!awemeId) continue

    const createTime = p.create_time as number | undefined
    if (!createTime) continue
    const postedAt = new Date(createTime * 1000).toISOString()

    const video = p.video as Record<string, unknown> | undefined
    const cover = (video?.dynamic_cover ?? video?.cover) as string | null ?? null

    const authorHandle = (p.author as Record<string, unknown> | undefined)?.unique_id as string | undefined
    const shareUrl = p.share_url as string | undefined
    const postUrl = shareUrl ?? `https://www.tiktok.com/@${authorHandle ?? handle}/video/${awemeId}`

    posts.push({
      ensemble_post_id: awemeId,
      post_url: postUrl,
      caption: (p.desc as string | undefined) ?? null,
      thumbnail_url: cover,
      posted_at: postedAt,
    })
  }
  return { posts, resolvedId: null }
}

async function scrapeYouTube(channelHandle: string, cachedChannelId?: string | null): Promise<ScrapeResult> {
  let channelId: string | null = cachedChannelId ?? null

  // Resolve handle → channel_id if not cached
  if (!channelId) {
    // If handle looks like a raw channel_id (starts with UC), use it directly
    if (channelHandle.startsWith('UC')) {
      channelId = channelHandle
    } else {
      const resolveRes = await fetch(
        `${ENSEMBLE_API_URL}/youtube/channel/name-to-id?username=${encodeURIComponent(channelHandle)}&token=${ENSEMBLE_API_KEY}`
      )
      if (resolveRes.ok) {
        const resolveJson = await resolveRes.json() as { data?: string | { channel_id?: string } }
        if (typeof resolveJson.data === 'string') channelId = resolveJson.data
        else if (resolveJson.data?.channel_id) channelId = resolveJson.data.channel_id
      }
    }
  }

  if (!channelId) {
    console.error(`[posts-worker] YT could not resolve channel_id for ${channelHandle}`)
    return { posts: [], resolvedId: null }
  }

  const res = await fetch(
    `${ENSEMBLE_API_URL}/youtube/channel/videos?channel_id=${encodeURIComponent(channelId)}&token=${ENSEMBLE_API_KEY}`
  )
  if (!res.ok) {
    console.error(`[posts-worker] YT channel/videos failed for ${channelHandle}: ${res.status}`)
    return { posts: [], resolvedId: channelId }
  }
  const json = await res.json() as { data?: unknown[] }
  if (!Array.isArray(json.data)) return { posts: [], resolvedId: channelId }

  const posts: NormalizedPost[] = []
  for (const item of json.data) {
    const v = item as Record<string, unknown>
    const videoId = (v.video_id ?? v.id) as string | undefined
    if (!videoId) continue

    const publishedAt = (v.published_at ?? v.upload_date) as string | undefined
    if (!publishedAt) continue
    const postedAt = new Date(publishedAt).toISOString()

    const title = (v.title as string | undefined) ?? null
    const description = (v.description as string | undefined) ?? null
    const caption = title && description ? `${title}\n\n${description}` : title ?? description

    posts.push({
      ensemble_post_id: videoId,
      post_url: (v.url as string | undefined) ?? `https://www.youtube.com/watch?v=${videoId}`,
      caption,
      thumbnail_url: (v.thumbnail ?? v.thumbnail_url) as string | null ?? null,
      posted_at: postedAt,
    })
  }
  return { posts, resolvedId: channelId }
}

// ─── Main handler ──────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = createServiceClient()

  // Load all active campaign_influencers with campaign + influencer data
  const { data: rows, error: loadError } = await supabase
    .from('campaign_influencers')
    .select(`
      id,
      usage_rights,
      monitoring_status,
      campaigns!inner (
        id,
        workspace_id,
        start_date,
        end_date,
        platforms,
        status,
        campaign_tracking_configs (
          platform,
          hashtags,
          mentions
        )
      ),
      influencers!inner (
        id,
        ig_handle,
        instagram_user_id,
        tiktok_handle,
        youtube_handle,
        youtube_channel_id
      )
    `)
    .in('monitoring_status', ['pending', 'active'])
    .eq('campaigns.status', 'active')

  if (loadError) {
    console.error('[posts-worker] Failed to load targets:', loadError)
    return NextResponse.json({ error: loadError.message }, { status: 500 })
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ scraped: 0, newPosts: 0 })
  }

  let totalScraped = 0
  let totalNewPosts = 0
  const errors: string[] = []

  for (const row of rows) {
    const campaign = row.campaigns as unknown as {
      id: string
      workspace_id: string
      start_date: string
      end_date: string
      platforms: string[]
      campaign_tracking_configs: Array<{ platform: string; hashtags: string[]; mentions: string[] }>
    }
    const influencer = row.influencers as unknown as {
      id: string
      ig_handle: string | null
      instagram_user_id: string | null
      tiktok_handle: string | null
      youtube_handle: string | null
      youtube_channel_id: string | null
    }

    const platformsToScrape: Array<'instagram' | 'tiktok' | 'youtube'> = (
      campaign.platforms as Array<'instagram' | 'tiktok' | 'youtube'>
    ).filter((p) => {
      if (p === 'instagram') return !!influencer.ig_handle
      if (p === 'tiktok') return !!influencer.tiktok_handle
      if (p === 'youtube') return !!influencer.youtube_handle
      return false
    })

    for (const platform of platformsToScrape) {
      const handle =
        platform === 'instagram' ? influencer.ig_handle! :
        platform === 'tiktok' ? influencer.tiktok_handle! :
        influencer.youtube_handle!

      try {
        // Scrape raw posts from EnsembleData (pass cached IDs to skip redundant API calls)
        let result: ScrapeResult = { posts: [], resolvedId: null }
        if (platform === 'instagram') {
          result = await scrapeInstagram(handle, influencer.instagram_user_id)
        } else if (platform === 'tiktok') {
          result = await scrapeTikTok(handle, row.monitoring_status === 'pending' ? 20 : 1)
        } else if (platform === 'youtube') {
          result = await scrapeYouTube(handle, influencer.youtube_channel_id)
        }

        const { posts: rawPosts, resolvedId } = result
        totalScraped += rawPosts.length

        // Persist newly resolved IDs back to influencers table (IG: instagram_user_id, YT: youtube_channel_id)
        if (resolvedId && platform !== 'tiktok') {
          const idField = platform === 'instagram' ? 'instagram_user_id' : 'youtube_channel_id'
          const cached = platform === 'instagram' ? influencer.instagram_user_id : influencer.youtube_channel_id
          if (resolvedId !== cached) {
            await supabase.from('influencers').update({ [idField]: resolvedId }).eq('id', influencer.id)
          }
        }

        // Find tracking config for this platform
        const config = campaign.campaign_tracking_configs?.find((c) => c.platform === platform)
        const hashtags = config?.hashtags ?? []
        const mentions = config?.mentions ?? []

        // Filter: within campaign date window AND matches tracking criteria
        const filtered = rawPosts.filter((post) =>
          isWithinCampaignWindow(post.posted_at, campaign.start_date, campaign.end_date) &&
          matchesTrackingConfig(post.caption, hashtags, mentions)
        )

        if (filtered.length === 0) continue

        // Build insert rows
        const insertRows = filtered.map((post) => ({
          workspace_id: campaign.workspace_id,
          campaign_id: campaign.id,
          influencer_id: influencer.id,
          platform,
          post_url: post.post_url,
          platform_post_id: post.ensemble_post_id,
          caption: post.caption,
          thumbnail_url: post.thumbnail_url,
          posted_at: post.posted_at,
          download_status: row.usage_rights ? 'pending' : 'blocked',
          blocked_reason: row.usage_rights ? null : 'no_usage_rights',
        }))

        // Idempotent upsert — ON CONFLICT (platform_post_id, campaign_id) DO NOTHING
        const { data: inserted, error: insertError } = await supabase
          .from('posts')
          .upsert(insertRows, { onConflict: 'platform_post_id,campaign_id', ignoreDuplicates: true })
          .select('id, download_status')

        if (insertError) {
          errors.push(`[${platform}/@${handle}] insert: ${insertError.message}`)
          continue
        }

        const newPosts = inserted ?? []
        totalNewPosts += newPosts.length

        // Enqueue download jobs for posts with usage rights
        const downloadable = newPosts.filter((p) => p.download_status === 'pending')
        if (downloadable.length > 0) {
          const { error: queueError } = await supabase.from('retry_queue').insert(
            downloadable.map((p) => ({
              post_id: p.id,
              job_type: 'download',
              status: 'pending',
            }))
          )
          if (queueError) {
            errors.push(`[${platform}/@${handle}] queue: ${queueError.message}`)
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`[${platform}/@${handle}] ${message}`)
      }
    }

    // Activate monitoring after first successful scrape run
    if (row.monitoring_status === 'pending') {
      await supabase
        .from('campaign_influencers')
        .update({ monitoring_status: 'active' })
        .eq('id', row.id)
    }
  }

  return NextResponse.json({
    scraped: totalScraped,
    newPosts: totalNewPosts,
    ...(errors.length > 0 && { errors }),
  })
}
