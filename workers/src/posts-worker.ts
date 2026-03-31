import { createServiceClient } from './lib/supabase'
import { differenceInDays } from 'date-fns'

const ENSEMBLE_API_URL = process.env.ENSEMBLE_API_URL ?? 'https://ensembledata.com/apis'
const ENSEMBLE_API_KEY = process.env.ENSEMBLE_API_KEY!

// ─── Types ─────────────────────────────────────────────────────────────────────

interface NormalizedPost {
  ensemble_post_id: string
  post_url: string
  caption: string | null
  thumbnail_url: string | null
  posted_at: string
}

interface ScrapeResult {
  posts: NormalizedPost[]
  resolvedId: string | null
  nextCursor?: bigint | null
  reachedCampaignStart?: boolean
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function matchesTrackingConfig(
  caption: string | null,
  hashtags: string[],
  mentions: string[]
): boolean {
  if (hashtags.length === 0 && mentions.length === 0) return false
  if (!caption) return false
  const lower = caption.toLowerCase()
  const after = '(?:[^a-z0-9_]|$)'
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const testHashtag = (keyword: string): boolean => {
    const k = esc(keyword)
    return (
      new RegExp(`#${k}${after}`).test(lower) ||
      new RegExp(`(?:^|[^a-z0-9_#@])${k}${after}`).test(lower)
    )
  }
  const testMention = (keyword: string): boolean => {
    const k = esc(keyword)
    return (
      new RegExp(`@${k}`).test(lower) ||
      new RegExp(`(?:^|[^a-z0-9_#@])${k}`).test(lower)
    )
  }
  return (
    hashtags.some((h) => testHashtag(h.replace(/^#/, '').toLowerCase())) ||
    mentions.some((m) => testMention(m.replace(/^@/, '').toLowerCase()))
  )
}

function isWithinCampaignWindow(postedAt: string, startDate: string, endDate: string | null): boolean {
  const posted = new Date(postedAt).getTime()
  const start = new Date(startDate).getTime()
  if (!endDate) return posted >= start
  const end = new Date(`${endDate}T23:59:59Z`).getTime()
  return posted >= start && posted <= end
}

// ─── Platform scrapers ─────────────────────────────────────────────────────────

function parseIgItem(
  p: Record<string, unknown>,
  urlType: 'p' | 'reel'
): NormalizedPost | null {
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
    ?? (p.edge_media_to_caption as { edges?: Array<{ node?: { text?: string } }> } | undefined)
         ?.edges?.[0]?.node?.text
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
  const [postsRes, reelsRes] = await Promise.all([
    fetch(`${ENSEMBLE_API_URL}/instagram/user/posts?user_id=${encodeURIComponent(userId)}&depth=3&token=${ENSEMBLE_API_KEY}`),
    fetch(`${ENSEMBLE_API_URL}/instagram/user/reels?user_id=${encodeURIComponent(userId)}&depth=3&token=${ENSEMBLE_API_KEY}`),
  ])
  const seenShortcodes = new Set<string>()
  const posts: NormalizedPost[] = []
  function extractIgItems(raw: unknown): Record<string, unknown>[] {
    if (Array.isArray(raw)) {
      return raw.map((item) => {
        const r = item as Record<string, unknown>
        return (r.node as Record<string, unknown> | undefined) ?? r
      })
    }
    const nested = (raw as Record<string, unknown> | null)?.posts
    if (Array.isArray(nested)) {
      return nested.map((item) => {
        const r = item as Record<string, unknown>
        return (r.node as Record<string, unknown> | undefined) ?? r
      })
    }
    return []
  }
  if (postsRes.ok) {
    const postsJson = await postsRes.json() as { data?: unknown }
    for (const item of extractIgItems(postsJson.data)) {
      const normalized = parseIgItem(item, 'p')
      if (normalized && !seenShortcodes.has(normalized.ensemble_post_id)) {
        seenShortcodes.add(normalized.ensemble_post_id)
        posts.push(normalized)
      }
    }
  } else {
    console.error(`[posts-worker] IG user/posts failed for @${handle}: ${postsRes.status}`)
  }
  if (reelsRes.ok) {
    const reelsJson = await reelsRes.json() as { data?: unknown }
    for (const item of extractIgItems(reelsJson.data)) {
      const normalized = parseIgItem(item, 'reel')
      if (normalized && !seenShortcodes.has(normalized.ensemble_post_id)) {
        seenShortcodes.add(normalized.ensemble_post_id)
        posts.push(normalized)
      }
    }
  } else {
    console.error(`[posts-worker] IG user/reels failed for @${handle}: ${reelsRes.status}`)
  }
  return { posts, resolvedId: userId }
}

function parseTikTokItem(item: Record<string, unknown>, handle: string): NormalizedPost | null {
  const awemeId = item.aweme_id as string | undefined
  if (!awemeId) return null
  const createTime = item.create_time as number | undefined
  if (!createTime) return null
  const postedAt = new Date(createTime * 1000).toISOString()
  const video = item.video as Record<string, unknown> | undefined
  const rawCover = video?.dynamic_cover ?? video?.cover
  const cover = typeof rawCover === 'string'
    ? rawCover
    : (rawCover as Record<string, unknown> | undefined)?.url_list
      ? ((rawCover as Record<string, unknown>).url_list as string[])[0] ?? null
      : null
  const authorHandle = (item.author as Record<string, unknown> | undefined)?.unique_id as string | undefined
  const shareUrl = item.share_url as string | undefined
  const postUrl = shareUrl ?? `https://www.tiktok.com/@${authorHandle ?? handle}/video/${awemeId}`
  return {
    ensemble_post_id: awemeId,
    post_url: postUrl,
    caption: (item.desc as string | undefined)
      ?? ((item.contents as Array<{ desc?: string }> | undefined)?.[0]?.desc)
      ?? null,
    thumbnail_url: cover,
    posted_at: postedAt,
  }
}

async function scrapeTikTok(
  handle: string,
  startCursor?: bigint | null,
  campaignStartDate?: string | null,
  depth: number = 1,
): Promise<ScrapeResult> {
  let url = `${ENSEMBLE_API_URL}/tt/user/posts?username=${encodeURIComponent(handle)}&depth=${depth}&token=${ENSEMBLE_API_KEY}`
  if (startCursor != null) {
    url += `&start_cursor=${startCursor.toString()}`
  }
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    console.error(`[posts-worker] TT user/posts failed for @${handle}: ${res.status}`)
    return { posts: [], resolvedId: null }
  }
  const json = await res.json() as { data?: unknown[]; nextCursor?: number | string | null }
  if (!Array.isArray(json.data)) return { posts: [], resolvedId: null }
  const posts: NormalizedPost[] = []
  for (const item of json.data) {
    const p = item as Record<string, unknown>
    const normalized = parseTikTokItem(p, handle)
    if (!normalized) continue
    posts.push(normalized)
  }
  const rawCursor = json.nextCursor
  const nextCursor: bigint | null = rawCursor != null && rawCursor !== '' && rawCursor !== 0
    ? BigInt(String(rawCursor))
    : null
  let reachedCampaignStart = false
  if (!nextCursor || posts.length === 0) {
    reachedCampaignStart = true
  } else if (campaignStartDate) {
    const campaignStartMs = new Date(campaignStartDate).getTime()
    reachedCampaignStart = Number(nextCursor) <= campaignStartMs
  }
  return { posts, resolvedId: null, nextCursor, reachedCampaignStart }
}

async function scrapeYouTube(channelHandle: string, cachedChannelId?: string | null): Promise<ScrapeResult> {
  let channelId: string | null = cachedChannelId ?? null
  if (!channelId) {
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

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const supabase = createServiceClient()

  const { data: rows, error: loadError } = await supabase
    .from('campaign_influencers')
    .select(`
      id,
      usage_rights,
      monitoring_status,
      tiktok_next_cursor,
      tiktok_backfill_complete,
      product_sent_at,
      added_at,
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
    process.exit(1)
  }

  if (!rows || rows.length === 0) {
    console.log(JSON.stringify({ scraped: 0, newPosts: 0 }))
    process.exit(0)
  }

  let totalScraped = 0
  let totalNewPosts = 0
  const errors: string[] = []

  for (const row of rows) {
    const clockStart = (row.product_sent_at as string | null) ?? (row.added_at as string)
    const daysSince = differenceInDays(new Date(), new Date(clockStart))
    if (daysSince < 7) continue

    const campaign = row.campaigns as unknown as {
      id: string
      workspace_id: string
      start_date: string
      end_date: string | null
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
    const tiktokNextCursor: bigint | null = row.tiktok_next_cursor != null
      ? BigInt(String(row.tiktok_next_cursor))
      : null
    const tiktokBackfillComplete: boolean = (row.tiktok_backfill_complete as boolean | null) ?? false

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
        let result: ScrapeResult = { posts: [], resolvedId: null }
        if (platform === 'instagram') {
          result = await scrapeInstagram(handle, influencer.instagram_user_id)
        } else if (platform === 'tiktok') {
          const cursorForThisRun = tiktokBackfillComplete ? null : tiktokNextCursor
          const depth = tiktokBackfillComplete ? 1 : 5
          const backfillTarget = (row.product_sent_at as string | null) ?? campaign.start_date
          result = await scrapeTikTok(handle, cursorForThisRun, backfillTarget, depth)
        } else if (platform === 'youtube') {
          result = await scrapeYouTube(handle, influencer.youtube_channel_id)
        }

        const { posts: rawPosts, resolvedId } = result
        totalScraped += rawPosts.length

        if (resolvedId && platform !== 'tiktok') {
          const idField = platform === 'instagram' ? 'instagram_user_id' : 'youtube_channel_id'
          const cached = platform === 'instagram' ? influencer.instagram_user_id : influencer.youtube_channel_id
          if (resolvedId !== cached) {
            await supabase.from('influencers').update({ [idField]: resolvedId }).eq('id', influencer.id)
          }
        }

        if (platform === 'tiktok' && !tiktokBackfillComplete) {
          const backfillNowComplete = result.reachedCampaignStart === true
          await supabase
            .from('campaign_influencers')
            .update({
              tiktok_next_cursor: backfillNowComplete ? null : (result.nextCursor != null ? result.nextCursor.toString() : null),
              tiktok_backfill_complete: backfillNowComplete,
            })
            .eq('id', row.id)
          console.log(
            `[posts-worker] TT @${handle} cursor=${result.nextCursor ?? 'end'} backfillComplete=${backfillNowComplete}`
          )
        }

        const config = campaign.campaign_tracking_configs?.find((c) => c.platform === platform)
        const hashtags = config?.hashtags ?? []
        const mentions = config?.mentions ?? []

        const filtered = rawPosts.filter((post) =>
          isWithinCampaignWindow(post.posted_at, campaign.start_date, campaign.end_date) &&
          matchesTrackingConfig(post.caption, hashtags, mentions)
        )

        if (filtered.length === 0) continue

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

    if (row.monitoring_status === 'pending') {
      await supabase
        .from('campaign_influencers')
        .update({ monitoring_status: 'active' })
        .eq('id', row.id)
    }
  }

  console.log(JSON.stringify({
    scraped: totalScraped,
    newPosts: totalNewPosts,
    ...(errors.length > 0 && { errors }),
  }))
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
