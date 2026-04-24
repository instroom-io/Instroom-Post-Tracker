import { createServiceClient } from './lib/supabase'

const ENSEMBLE_API_URL = process.env.ENSEMBLE_API_URL ?? 'https://ensembledata.com/apis'
const ENSEMBLE_API_KEY = process.env.ENSEMBLE_API_KEY!

// ─── Types ─────────────────────────────────────────────────────────────────────

interface NormalizedPost {
  ensemble_post_id: string
  post_url: string
  caption: string | null
  thumbnail_url: string | null
  media_url: string | null
  posted_at: string
}

interface ScrapeResult {
  posts: NormalizedPost[]
  resolvedId: string | null
  nextCursor?: bigint | null
  avatarUrl: string | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Download a CDN thumbnail and upload to Supabase Storage so we own a
 * permanent, publicly-accessible copy that never expires or requires auth.
 * Falls back to the original CDN URL on any error.
 */
async function mirrorThumbnail(
  supabase: ReturnType<typeof createServiceClient>,
  cdnUrl: string,
  workspaceId: string,
  platformPostId: string,
  platform: string,
): Promise<string> {
  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    }
    if (platform === 'instagram') headers['Referer'] = 'https://www.instagram.com/'
    if (platform === 'tiktok') headers['Referer'] = 'https://www.tiktok.com/'

    const res = await fetch(cdnUrl, { headers })
    if (!res.ok) return cdnUrl

    const buffer = await res.arrayBuffer()
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
    const storagePath = `${workspaceId}/${platformPostId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('post-thumbnails')
      .upload(storagePath, buffer, { contentType, upsert: true })

    if (uploadError) return cdnUrl

    const { data: { publicUrl } } = supabase.storage
      .from('post-thumbnails')
      .getPublicUrl(storagePath)

    return publicUrl
  } catch {
    return cdnUrl
  }
}

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

function extractAuthorAvatar(author: Record<string, unknown> | undefined): string | null {
  if (!author) return null
  for (const key of ['avatarLarger', 'avatarMedium', 'avatarThumb', 'avatar_larger', 'avatar_thumb']) {
    const raw = author[key]
    if (typeof raw === 'string' && raw.startsWith('http')) return raw
    if (raw && typeof raw === 'object') {
      const list = (raw as Record<string, unknown>).url_list as string[] | undefined
      if (list?.[0]) return list[0]
    }
  }
  return null
}

async function fetchAvatarUrl(
  platform: 'tiktok' | 'instagram',
  handle: string
): Promise<string | null> {
  try {
    if (platform === 'tiktok') {
      const res = await fetch(
        `${ENSEMBLE_API_URL}/tt/user/info?username=${encodeURIComponent(handle)}&token=${ENSEMBLE_API_KEY}`
      )
      if (!res.ok) return null
      const json = await res.json() as { data?: unknown }
      const data = json.data as Record<string, unknown> | undefined
      const user = (
        (data?.userInfo as Record<string, unknown> | undefined)?.user as Record<string, unknown> | undefined
      ) ?? (data?.user as Record<string, unknown> | undefined)
      return extractAuthorAvatar(user)
    }
    if (platform === 'instagram') {
      const res = await fetch(
        `${ENSEMBLE_API_URL}/instagram/user/info?username=${encodeURIComponent(handle)}&token=${ENSEMBLE_API_KEY}`
      )
      if (!res.ok) return null
      const json = await res.json() as { data?: Record<string, unknown> }
      return (json.data?.profile_pic_url as string | undefined) ?? null
    }
    return null
  } catch {
    return null
  }
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
    media_url: (p.video_url ?? p.display_url) as string | null ?? null,
    posted_at: postedAt,
  }
}

async function scrapeInstagram(handle: string, cachedUserId?: string | null, depth: number = 3): Promise<ScrapeResult> {
  let userId: string | null = cachedUserId ?? null
  let rawAvatarUrl: string | null = null
  if (!userId) {
    const infoRes = await fetch(
      `${ENSEMBLE_API_URL}/instagram/user/info?username=${encodeURIComponent(handle)}&token=${ENSEMBLE_API_KEY}`
    )
    if (!infoRes.ok) {
      console.error(`[posts-worker] IG user/info failed for @${handle}: ${infoRes.status}`)
      return { posts: [], resolvedId: null, avatarUrl: null }
    }
    const infoJson = await infoRes.json() as { data?: Record<string, unknown> }
    const raw = infoJson.data?.id ?? infoJson.data?.pk ?? infoJson.data?.user_id
    userId = raw ? String(raw) : null
    rawAvatarUrl = (infoJson.data?.profile_pic_url as string | undefined) ?? null
    if (!userId) {
      console.error(`[posts-worker] Could not resolve IG user_id for @${handle}`)
      return { posts: [], resolvedId: null, avatarUrl: rawAvatarUrl }
    }
  }
  const [postsRes, reelsRes] = await Promise.all([
    fetch(`${ENSEMBLE_API_URL}/instagram/user/posts?user_id=${encodeURIComponent(userId)}&depth=${depth}&token=${ENSEMBLE_API_KEY}`),
    fetch(`${ENSEMBLE_API_URL}/instagram/user/reels?user_id=${encodeURIComponent(userId)}&depth=${depth}&token=${ENSEMBLE_API_KEY}`),
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
  return { posts, resolvedId: userId, avatarUrl: rawAvatarUrl }
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
  const playAddr = video?.play_addr_h264 as Record<string, unknown> | undefined
  const mediaUrl = (playAddr?.url_list as string[] | undefined)?.[0] ?? null

  return {
    ensemble_post_id: awemeId,
    post_url: postUrl,
    caption: (item.desc as string | undefined)
      ?? ((item.contents as Array<{ desc?: string }> | undefined)?.[0]?.desc)
      ?? null,
    thumbnail_url: cover,
    media_url: mediaUrl,
    posted_at: postedAt,
  }
}

async function scrapeTikTok(handle: string): Promise<ScrapeResult> {
  const url = `${ENSEMBLE_API_URL}/tt/user/posts?username=${encodeURIComponent(handle)}&depth=1&token=${ENSEMBLE_API_KEY}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    console.error(`[posts-worker] TT user/posts failed for @${handle}: ${res.status}`)
    return { posts: [], resolvedId: null, avatarUrl: null }
  }
  const json = await res.json() as { data?: unknown[]; nextCursor?: number | string | null }
  if (!Array.isArray(json.data)) return { posts: [], resolvedId: null, avatarUrl: null }
  const posts: NormalizedPost[] = []
  let avatarUrl: string | null = null
  for (const item of json.data) {
    const p = item as Record<string, unknown>
    if (!avatarUrl) {
      const author = p.author as Record<string, unknown> | undefined
      avatarUrl = extractAuthorAvatar(author)
    }
    const normalized = parseTikTokItem(p, handle)
    if (!normalized) continue
    posts.push(normalized)
  }
  return { posts, resolvedId: null, avatarUrl }
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
    return { posts: [], resolvedId: null, avatarUrl: null }
  }
  const res = await fetch(
    `${ENSEMBLE_API_URL}/youtube/channel/videos?channel_id=${encodeURIComponent(channelId)}&token=${ENSEMBLE_API_KEY}`
  )
  if (!res.ok) {
    console.error(`[posts-worker] YT channel/videos failed for ${channelHandle}: ${res.status}`)
    return { posts: [], resolvedId: channelId, avatarUrl: null }
  }
  const json = await res.json() as { data?: unknown[] }
  if (!Array.isArray(json.data)) return { posts: [], resolvedId: channelId, avatarUrl: null }
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
      media_url: null, // YouTube has no direct download URL
      posted_at: postedAt,
    })
  }
  return { posts, resolvedId: channelId, avatarUrl: null }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const supabase = createServiceClient()

  console.log(`[posts-worker] run started at ${new Date().toISOString()}`)

  // Bulk-activate all pending influencers immediately — no delay.
  // The 7-day wait applies only to the metrics-worker (post metrics stabilisation),
  // not to post scraping. Influencers are scraped on the very next worker run after being added.
  const { error: activateError } = await supabase
    .from('campaign_influencers')
    .update({ monitoring_status: 'active' })
    .eq('monitoring_status', 'pending')
  if (activateError) console.error('[posts-worker] bulk-activate error:', activateError.message)
  else console.log('[posts-worker] bulk-activation complete')

  const { data: rows, error: loadError } = await supabase
    .from('campaign_influencers')
    .select(`
      id,
      usage_rights,
      monitoring_status,
      tiktok_last_post_at,
      ig_last_post_at,
      yt_last_post_at,
      stop_after_post,
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
        youtube_channel_id,
        profile_pic_refreshed_at
      )
    `)
    .in('monitoring_status', ['pending', 'active'])
    .eq('campaigns.status', 'active')

  if (loadError) {
    console.error('[posts-worker] Failed to load targets:', loadError)
    process.exit(1)
  }

  if (!rows || rows.length === 0) {
    console.log('[posts-worker] no active/pending influencers to process')
    console.log(JSON.stringify({ scraped: 0, newPosts: 0 }))
    process.exit(0)
  }

  console.log(`[posts-worker] loaded ${rows.length} influencer row(s) to process`)

  let totalFetched = 0
  let totalCandidates = 0
  let totalNewPosts = 0
  const errors: string[] = []

  for (const row of rows) {
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
      profile_pic_refreshed_at: string | null
    }
    const tiktokLastPostAt: string | null = row.tiktok_last_post_at as string | null
    const igLastPostAt: string | null = row.ig_last_post_at as string | null
    const ytLastPostAt: string | null = row.yt_last_post_at as string | null
    const stopAfterPost: boolean = (row.stop_after_post as boolean | null) ?? false
    const effectiveStartMs = row.product_sent_at
      ? new Date(row.product_sent_at as string).getTime()
      : new Date(row.added_at as string).getTime()

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
        let result: ScrapeResult = { posts: [], resolvedId: null, avatarUrl: null }
        if (platform === 'instagram') {
          result = await scrapeInstagram(handle, influencer.instagram_user_id, 1)
        } else if (platform === 'tiktok') {
          result = await scrapeTikTok(handle)
        } else if (platform === 'youtube') {
          result = await scrapeYouTube(handle, influencer.youtube_channel_id)
        }

        const { posts: rawPosts, resolvedId } = result
        totalFetched += rawPosts.length

        if (resolvedId && platform !== 'tiktok') {
          const idField = platform === 'instagram' ? 'instagram_user_id' : 'youtube_channel_id'
          const cached = platform === 'instagram' ? influencer.instagram_user_id : influencer.youtube_channel_id
          if (resolvedId !== cached) {
            await supabase.from('influencers').update({ [idField]: resolvedId }).eq('id', influencer.id)
          }
        }

        // Filter: only posts on/after effectiveStart (delivery date ?? added date)
        // AND newer than the last-seen watermark (skips already-processed posts).
        // IMPORTANT: compute unseenPosts BEFORE updating the watermark so that the
        // watermark advances only from posts that actually passed the effectiveStart
        // filter. If the watermark were computed from rawPosts (all scraped), pre-
        // effectiveStart posts would permanently block themselves — even after the user
        // later sets product_sent_at to a date before those posts.
        const lastSeenMs =
          platform === 'instagram' && igLastPostAt ? new Date(igLastPostAt).getTime() :
          platform === 'tiktok' && tiktokLastPostAt ? new Date(tiktokLastPostAt).getTime() :
          platform === 'youtube' && ytLastPostAt ? new Date(ytLastPostAt).getTime() :
          0
        const unseenPosts = rawPosts.filter((p) => {
          const postedMs = new Date(p.posted_at).getTime()
          return postedMs >= effectiveStartMs && (lastSeenMs === 0 || postedMs > lastSeenMs)
        })

        // Update watermark: advance only from posts that passed the effectiveStart
        // filter so pre-effectiveStart posts never permanently block future captures.
        if (platform === 'tiktok' && unseenPosts.length > 0) {
          const newest = unseenPosts.reduce(
            (max, p) => p.posted_at > max ? p.posted_at : max,
            unseenPosts[0].posted_at
          )
          await supabase
            .from('campaign_influencers')
            .update({ tiktok_last_post_at: newest })
            .eq('id', row.id)
          console.log(`[posts-worker] TT @${handle} watermark → ${newest}`)
        }
        if (platform === 'instagram' && unseenPosts.length > 0) {
          const newest = unseenPosts.reduce((max, p) => p.posted_at > max ? p.posted_at : max, unseenPosts[0].posted_at)
          await supabase.from('campaign_influencers').update({ ig_last_post_at: newest }).eq('id', row.id)
          console.log(`[posts-worker] IG @${handle} cursor updated to ${newest}`)
        }
        if (platform === 'youtube' && unseenPosts.length > 0) {
          const newest = unseenPosts.reduce((max, p) => p.posted_at > max ? p.posted_at : max, unseenPosts[0].posted_at)
          await supabase.from('campaign_influencers').update({ yt_last_post_at: newest }).eq('id', row.id)
          console.log(`[posts-worker] YT ${handle} cursor updated to ${newest}`)
        }
        totalCandidates += unseenPosts.length

        const config = campaign.campaign_tracking_configs?.find((c) => c.platform === platform)
        const hashtags = config?.hashtags ?? []
        const mentions = config?.mentions ?? []

        const filtered = unseenPosts.filter((post) =>
          isWithinCampaignWindow(post.posted_at, campaign.start_date, campaign.end_date) &&
          matchesTrackingConfig(post.caption, hashtags, mentions)
        )
        console.log(`[posts-worker] @${handle} [${platform}] fetched=${rawPosts.length} candidates=${unseenPosts.length} matched=${filtered.length}`)

        if (filtered.length === 0) continue

        // Download thumbnails to Supabase Storage so we own permanent copies
        // that never expire or require CDN authentication.
        const insertRows = await Promise.all(
          filtered.map(async (post) => ({
            workspace_id: campaign.workspace_id,
            campaign_id: campaign.id,
            influencer_id: influencer.id,
            platform,
            post_url: post.post_url,
            platform_post_id: post.ensemble_post_id,
            caption: post.caption,
            thumbnail_url: post.thumbnail_url
              ? await mirrorThumbnail(supabase, post.thumbnail_url, campaign.workspace_id, post.ensemble_post_id, platform)
              : null,
            media_url: post.media_url,
            posted_at: post.posted_at,
            download_status: row.usage_rights ? 'pending' : 'blocked',
            blocked_reason: row.usage_rights ? null : 'no_usage_rights',
          }))
        )

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

        // Auto-stop monitoring when stop_after_post is enabled and a new matching post was found.
        if (stopAfterPost && newPosts.length > 0) {
          await supabase
            .from('campaign_influencers')
            .update({ monitoring_status: 'stopped' })
            .eq('id', row.id)
          console.log(`[posts-worker] @${handle} auto-stopped after post detected`)
        }

        // Backfill media_url for existing posts that were scraped before this column existed
        const toBackfill = filtered.filter((p) => p.media_url !== null)
        for (const post of toBackfill) {
          await supabase
            .from('posts')
            .update({ media_url: post.media_url })
            .eq('platform_post_id', post.ensemble_post_id)
            .eq('campaign_id', campaign.id)
            .is('media_url', null)
        }

        // Mirror thumbnail_url to Supabase Storage for existing posts that still have expiring CDN URLs.
        // Runs over ALL rawPosts (not just unseenPosts) because previously-seen posts may have been
        // inserted before the storage bucket existed. EnsembleData always returns fresh CDN URLs, so
        // rawPosts[i].thumbnail_url is valid even when the stored DB URL has already expired.
        const rawWithThumb = rawPosts.filter(p => p.thumbnail_url !== null)
        if (rawWithThumb.length > 0) {
          const { data: needsMirror } = await supabase
            .from('posts')
            .select('platform_post_id')
            .eq('campaign_id', campaign.id)
            .in('platform_post_id', rawWithThumb.map(p => p.ensemble_post_id))
            .not('thumbnail_url', 'like', '%supabase.co%')
          const mirrorSet = new Set((needsMirror ?? []).map(p => p.platform_post_id))
          for (const post of rawWithThumb.filter(p => mirrorSet.has(p.ensemble_post_id))) {
            const permanentUrl = await mirrorThumbnail(supabase, post.thumbnail_url!, campaign.workspace_id, post.ensemble_post_id, platform)
            if (permanentUrl !== post.thumbnail_url) {
              await supabase
                .from('posts')
                .update({ thumbnail_url: permanentUrl })
                .eq('platform_post_id', post.ensemble_post_id)
                .eq('campaign_id', campaign.id)
            }
          }
        }

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

        // Re-queue any pending posts that lost their retry_queue entry.
        // This handles cases where the initial insert was a duplicate (ignoreDuplicates)
        // and the original queue entry was never created or was dropped.
        const { data: allPending } = await supabase
          .from('posts')
          .select('id')
          .eq('campaign_id', campaign.id)
          .eq('influencer_id', influencer.id)
          .eq('download_status', 'pending')

        if (allPending && allPending.length > 0) {
          const pendingIds = allPending.map((p) => p.id)
          const { data: activeJobs } = await supabase
            .from('retry_queue')
            .select('post_id')
            .in('post_id', pendingIds)
            .in('status', ['pending', 'processing'])

          const activeSet = new Set(activeJobs?.map((j) => j.post_id) ?? [])
          const orphans = allPending.filter((p) => !activeSet.has(p.id))

          if (orphans.length > 0) {
            await supabase.from('retry_queue').insert(
              orphans.map((p) => ({
                post_id: p.id,
                job_type: 'download',
                status: 'pending',
              }))
            )
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`[${platform}/@${handle}] ${message}`)
      }
    }

  }

  console.log(JSON.stringify({
    fetched: totalFetched,
    candidates: totalCandidates,
    newPosts: totalNewPosts,
    ...(errors.length > 0 && { errors }),
  }))
  process.exit(0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
