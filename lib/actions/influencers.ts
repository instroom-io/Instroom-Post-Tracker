'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { addInfluencerSchema, updateInfluencerSchema, updateProductSentAtSchema, type UpdateProductSentAtInput } from '@/lib/validations'
import type {
  InfluencerProfile,
  InfluencerProfileCampaign,
  InfluencerPlatformStats,
  InfluencerProfilePost,
  Platform,
  CampaignStatus,
  MonitoringStatus,
  DownloadStatus,
} from '@/lib/types'

const ENSEMBLE_API_URL = process.env.ENSEMBLE_API_URL ?? 'https://ensembledata.com/apis'
const ENSEMBLE_API_KEY = process.env.ENSEMBLE_API_KEY!

export type HandleValidationResult = {
  handle: string
  status: 'valid' | 'private' | 'not_found'
  profile_pic_url?: string | null
}

async function fetchProfileInfo(
  platform: 'tiktok' | 'instagram' | 'youtube',
  handle: string
): Promise<{ profile_pic_url: string | null }> {
  try {
    if (platform === 'tiktok') {
      const res = await fetch(
        `${ENSEMBLE_API_URL}/tt/user/info?username=${encodeURIComponent(handle)}&token=${ENSEMBLE_API_KEY}`
      )
      if (!res.ok) return { profile_pic_url: null }
      const json = await res.json() as { data?: unknown }
      const data = json.data as Record<string, unknown> | undefined

      // EnsembleData may nest user under data.userInfo.user, data.user, or data directly
      const user = (
        (data?.userInfo as Record<string, unknown> | undefined)?.user as Record<string, unknown> | undefined
      ) ?? (data?.user as Record<string, unknown> | undefined) ?? data

      // Avatar fields: try larger quality first; handle both string URL and {url_list} object
      function extractAvatar(obj: Record<string, unknown> | undefined): string | null {
        if (!obj) return null
        for (const key of ['avatarLarger', 'avatarMedium', 'avatarThumb', 'avatar_larger', 'avatar_thumb']) {
          const raw = obj[key]
          if (typeof raw === 'string' && raw.startsWith('http')) return raw
          if (raw && typeof raw === 'object') {
            const list = (raw as Record<string, unknown>).url_list as string[] | undefined
            if (list?.[0]) return list[0]
          }
        }
        return null
      }

      return { profile_pic_url: extractAvatar(user) }
    }

    if (platform === 'instagram') {
      const res = await fetch(
        `${ENSEMBLE_API_URL}/instagram/user/info?username=${encodeURIComponent(handle)}&token=${ENSEMBLE_API_KEY}`
      )
      if (!res.ok) return { profile_pic_url: null }
      const json = await res.json() as { data?: Record<string, unknown> }
      const profile_pic_url = (json.data?.profile_pic_url as string | undefined) ?? null
      return { profile_pic_url }
    }

    // YouTube: name-to-id returns no avatar
    return { profile_pic_url: null }
  } catch {
    return { profile_pic_url: null }
  }
}

export async function validateInfluencerHandles(
  workspaceId: string,
  platform: 'tiktok' | 'instagram' | 'youtube',
  handles: string[]
): Promise<HandleValidationResult[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member) return handles.map((handle) => ({ handle, status: 'not_found' }))

  async function checkTikTok(handle: string): Promise<HandleValidationResult> {
    try {
      const res = await fetch(
        `${ENSEMBLE_API_URL}/tt/user/posts?username=${encodeURIComponent(handle)}&depth=1&token=${ENSEMBLE_API_KEY}`
      )
      if (!res.ok) return { handle, status: 'not_found' }
      const json = await res.json() as { data?: unknown[] }
      if (!Array.isArray(json.data)) return { handle, status: 'not_found' }
      const status = json.data.length > 0 ? 'valid' : 'private'
      // Fetch avatar separately via the dedicated user info endpoint
      const { profile_pic_url } = await fetchProfileInfo('tiktok', handle)
      return { handle, status, profile_pic_url }
    } catch {
      return { handle, status: 'not_found' }
    }
  }

  async function checkInstagram(handle: string): Promise<HandleValidationResult> {
    try {
      const res = await fetch(
        `${ENSEMBLE_API_URL}/instagram/user/info?username=${encodeURIComponent(handle)}&token=${ENSEMBLE_API_KEY}`
      )
      if (!res.ok) return { handle, status: 'not_found' }
      const json = await res.json() as { data?: Record<string, unknown> }
      const userId = json.data?.id ?? json.data?.pk ?? json.data?.user_id
      const rawPicUrl = (json.data?.profile_pic_url as string | undefined) ?? null
      // Proxy through our server — Instagram CDN blocks direct browser requests
      const profile_pic_url = rawPicUrl
        ? `/api/proxy-image?url=${encodeURIComponent(rawPicUrl)}`
        : null
      return { handle, status: userId ? 'valid' : 'not_found', profile_pic_url }
    } catch {
      return { handle, status: 'not_found' }
    }
  }

  async function checkYouTube(handle: string): Promise<HandleValidationResult> {
    try {
      const res = await fetch(
        `${ENSEMBLE_API_URL}/youtube/channel/name-to-id?username=${encodeURIComponent(handle)}&token=${ENSEMBLE_API_KEY}`
      )
      if (!res.ok) return { handle, status: 'not_found' }
      const json = await res.json() as { data?: string | { channel_id?: string } }
      const channelId = typeof json.data === 'string'
        ? json.data
        : json.data?.channel_id
      return { handle, status: channelId ? 'valid' : 'not_found', profile_pic_url: null }
    } catch {
      return { handle, status: 'not_found' }
    }
  }

  const checker = platform === 'tiktok' ? checkTikTok
    : platform === 'instagram' ? checkInstagram
    : checkYouTube

  return Promise.all(handles.map(checker))
}

export async function addInfluencer(
  workspaceId: string,
  data: unknown,
  campaignId?: string
): Promise<{ error: string } | void> {
  const parsed = addInfluencerSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin', 'editor', 'manager'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  const platform = parsed.data.tiktok_handle ? 'tiktok'
    : parsed.data.ig_handle ? 'instagram'
    : 'youtube'
  const handle = parsed.data.tiktok_handle || parsed.data.ig_handle || parsed.data.youtube_handle || ''
  const handleField = platform === 'tiktok' ? 'tiktok_handle'
    : platform === 'instagram' ? 'ig_handle'
    : 'youtube_handle'

  // Reuse existing influencer if this handle is already in the workspace
  const { data: existing } = await supabase
    .from('influencers')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq(handleField, handle)
    .maybeSingle()

  let influencerId: string
  if (existing) {
    influencerId = existing.id
  } else {
    const { profile_pic_url } = handle ? await fetchProfileInfo(platform, handle) : { profile_pic_url: null }
    const { data: influencer, error } = await supabase
      .from('influencers')
      .insert({
        workspace_id: workspaceId,
        ig_handle: parsed.data.ig_handle || null,
        tiktok_handle: parsed.data.tiktok_handle || null,
        youtube_handle: parsed.data.youtube_handle || null,
        profile_pic_url,
      })
      .select('id')
      .single()
    if (error || !influencer) return { error: 'Failed to add influencer.' }
    influencerId = influencer.id
  }

  // Optionally add to campaign
  if (campaignId) {
    const result = await addInfluencerToCampaign(workspaceId, campaignId, influencerId)
    if (result?.error) return result
  }

  revalidatePath('/', 'layout')
}

export async function addInfluencersBatch(
  workspaceId: string,
  handles: string[],
  platform: 'tiktok' | 'instagram' | 'youtube',
  campaignId?: string,
  productSentAt?: string | null,
): Promise<{ error?: string; added: number; skipped: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin', 'editor', 'manager'].includes(member.role)) {
    return { error: 'Insufficient permissions.', added: 0, skipped: 0 }
  }

  const deduped = [...new Set(handles.map((h) => h.trim()).filter(Boolean))]
  if (deduped.length === 0) return { error: 'No valid handles provided.', added: 0, skipped: 0 }

  const handleField = platform === 'instagram' ? 'ig_handle'
    : platform === 'tiktok' ? 'tiktok_handle'
    : 'youtube_handle'

  // Find which handles already exist in this workspace — reuse their IDs
  const { data: existingInfluencers } = await supabase
    .from('influencers')
    .select(`id, ${handleField}`)
    .eq('workspace_id', workspaceId)
    .in(handleField, deduped)

  const existingMap = new Map(
    (existingInfluencers ?? []).map((inf) => [
      (inf as Record<string, string | null>)[handleField] as string,
      inf.id,
    ])
  )

  const newHandles = deduped.filter((h) => !existingMap.has(h))
  const existingIds = deduped.filter((h) => existingMap.has(h)).map((h) => existingMap.get(h)!)

  // Only fetch profiles and insert for new handles
  let newIds: string[] = []
  if (newHandles.length > 0) {
    const profiles = await Promise.all(newHandles.map((handle) => fetchProfileInfo(platform, handle)))
    const rows = newHandles.map((handle, i) => ({
      workspace_id: workspaceId,
      ig_handle: platform === 'instagram' ? handle : null,
      tiktok_handle: platform === 'tiktok' ? handle : null,
      youtube_handle: platform === 'youtube' ? handle : null,
      profile_pic_url: profiles[i].profile_pic_url,
    }))
    const { data: inserted, error } = await supabase
      .from('influencers')
      .insert(rows)
      .select('id')
    if (error) return { error: 'Failed to add influencers.', added: 0, skipped: 0 }
    newIds = (inserted ?? []).map((r) => r.id)
  }

  const allIds = [...existingIds, ...newIds]
  const added = newIds.length
  const skipped = deduped.length - allIds.length

  if (campaignId && allIds.length > 0) {
    const campaignRows = allIds.map((influencer_id) => ({
      campaign_id: campaignId,
      influencer_id,
      added_by: user.id,
      ...(productSentAt ? { product_sent_at: productSentAt } : {}),
    }))
    // ignoreDuplicates prevents re-adding influencers already in the campaign
    await supabase
      .from('campaign_influencers')
      .upsert(campaignRows, { onConflict: 'campaign_id,influencer_id', ignoreDuplicates: true })
  }

  revalidatePath('/', 'layout')
  return { added, skipped }
}

export async function addInfluencerToCampaign(
  workspaceId: string,
  campaignId: string,
  influencerId: string,
  productSentAt?: string | null,
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()
  if (!member || !['owner', 'admin', 'editor', 'manager'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  // Check for an existing row (may be soft-deleted)
  const { data: existing } = await supabase
    .from('campaign_influencers')
    .select('id, monitoring_status')
    .eq('campaign_id', campaignId)
    .eq('influencer_id', influencerId)
    .maybeSingle()

  if (existing) {
    if (existing.monitoring_status === 'removed') {
      // Re-add: reset the soft-deleted row back to pending
      const { error } = await supabase
        .from('campaign_influencers')
        .update({
          monitoring_status: 'pending',
          usage_rights: false,
          usage_rights_updated_at: null,
          tiktok_next_cursor: null,
          tiktok_backfill_complete: false,
          ig_last_post_at: null,
          yt_last_post_at: null,
          added_by: user.id,
          added_at: new Date().toISOString(),
          ...(productSentAt ? { product_sent_at: productSentAt } : { product_sent_at: null }),
        })
        .eq('id', existing.id)
      if (error) return { error: 'Failed to add influencer to campaign.' }
    } else {
      return { error: 'This influencer is already in this campaign.' }
    }
  } else {
    const { error } = await supabase.from('campaign_influencers').insert({
      campaign_id: campaignId,
      influencer_id: influencerId,
      added_by: user.id,
      ...(productSentAt ? { product_sent_at: productSentAt } : {}),
    })
    if (error) return { error: 'Failed to add influencer to campaign.' }
  }

  revalidatePath('/', 'layout')
}

export async function removeInfluencerFromCampaign(
  workspaceId: string,
  campaignInfluencerId: string
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()
  if (!member || !['owner', 'admin', 'editor', 'manager'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  const { error } = await supabase
    .from('campaign_influencers')
    .update({ monitoring_status: 'removed' })
    .eq('id', campaignInfluencerId)

  if (error) return { error: 'Failed to remove influencer.' }

  revalidatePath('/', 'layout')
}

export async function removeInfluencerFromWorkspace(
  influencerId: string,
  workspaceId: string
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify caller is an owner/admin/editor in this workspace (RLS also enforces)
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin', 'editor', 'manager'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  // Delete the influencer row; FK cascade handles campaign_influencers cleanup
  const { error } = await supabase
    .from('influencers')
    .delete()
    .eq('id', influencerId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Failed to remove influencer from workspace.' }

  revalidatePath('/', 'layout')
}

export async function updateProductSentAt(
  workspaceId: string,
  input: UpdateProductSentAtInput,
): Promise<{ error: string } | void> {
  const parsed = updateProductSentAtSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()
  if (!member || !['owner', 'admin', 'editor', 'manager'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  const { error } = await supabase
    .from('campaign_influencers')
    .update({ product_sent_at: parsed.data.productSentAt })
    .eq('id', parsed.data.campaignInfluencerId)

  if (error) return { error: 'Failed to update.' }

  revalidatePath('/', 'layout')
}

export async function updateInfluencer(
  workspaceId: string,
  influencerId: string,
  data: unknown
): Promise<{ error: string } | void> {
  const parsed = updateInfluencerSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('influencers')
    .update({
      ig_handle: parsed.data.ig_handle || null,
      tiktok_handle: parsed.data.tiktok_handle || null,
      youtube_handle: parsed.data.youtube_handle || null,
    })
    .eq('id', influencerId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Failed to update influencer.' }

  revalidatePath('/', 'layout')
}

export async function refreshInfluencerProfile(
  workspaceId: string,
  influencerId: string
): Promise<{ profile_pic_url: string | null } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!member || !['owner', 'admin', 'editor', 'manager'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  const { data: influencer } = await supabase
    .from('influencers')
    .select('tiktok_handle, ig_handle, youtube_handle')
    .eq('id', influencerId)
    .eq('workspace_id', workspaceId)
    .single()

  if (!influencer) return { error: 'Influencer not found.' }

  const platform = influencer.tiktok_handle ? 'tiktok'
    : influencer.ig_handle ? 'instagram'
    : 'youtube'
  const handle = influencer.tiktok_handle ?? influencer.ig_handle ?? influencer.youtube_handle ?? ''

  if (!handle) return { error: 'No handle found.' }

  const { profile_pic_url } = await fetchProfileInfo(platform, handle)

  const { error: updateError } = await supabase
    .from('influencers')
    .update({
      profile_pic_url,
      profile_pic_refreshed_at: new Date().toISOString(),
    })
    .eq('id', influencerId)
    .eq('workspace_id', workspaceId)

  if (updateError) return { error: 'Failed to save profile picture.' }

  revalidatePath('/', 'layout')
  return { profile_pic_url }
}

export async function toggleStopAfterPost(
  campaignInfluencerId: string,
  value: boolean
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('campaign_influencers')
    .update({ stop_after_post: value })
    .eq('id', campaignInfluencerId)
  if (error) return { error: 'Failed to update.' }

  revalidatePath('/', 'layout')
}

export async function getInfluencerProfile(
  workspaceId: string,
  influencerId: string
): Promise<InfluencerProfile | { error: string }> {
  const supabase = await createClient()

  const [membershipsResult, metricsResult, recentPostsResult] = await Promise.all([
    supabase
      .from('campaign_influencers')
      .select('id, campaign_id, monitoring_status, usage_rights, added_at, campaigns(id, name, status, platforms)')
      .eq('influencer_id', influencerId)
      .neq('monitoring_status', 'removed'),

    supabase
      .from('posts')
      .select('platform, posted_at, post_metrics(views, likes, comments, shares, saves, follower_count, emv, engagement_rate)')
      .eq('influencer_id', influencerId)
      .eq('workspace_id', workspaceId),

    supabase
      .from('posts')
      .select('id, platform, thumbnail_url, post_url, posted_at, download_status, post_metrics(views, emv)')
      .eq('influencer_id', influencerId)
      .eq('workspace_id', workspaceId)
      .order('posted_at', { ascending: false })
      .limit(9),
  ])

  if (membershipsResult.error) return { error: 'Failed to load campaign memberships.' }
  if (metricsResult.error) return { error: 'Failed to load metrics.' }
  if (recentPostsResult.error) return { error: 'Failed to load recent posts.' }

  // Aggregate platform stats client-side
  const statsMap = new Map<string, {
    post_count: number
    total_views: number
    total_likes: number
    total_comments: number
    total_shares: number
    total_saves: number
    total_emv: number
    er_sum: number
    er_count: number
    latest_posted_at: string | null
    latest_follower_count: number | null
  }>()
  for (const p of metricsResult.data ?? []) {
    const m = Array.isArray(p.post_metrics) ? p.post_metrics[0] : p.post_metrics
    const key = p.platform
    const existing = statsMap.get(key) ?? {
      post_count: 0, total_views: 0, total_likes: 0, total_comments: 0,
      total_shares: 0, total_saves: 0, total_emv: 0, er_sum: 0, er_count: 0,
      latest_posted_at: null, latest_follower_count: null,
    }
    existing.post_count += 1
    if (m) {
      existing.total_views += Number(m.views ?? 0)
      existing.total_likes += Number(m.likes ?? 0)
      existing.total_comments += Number(m.comments ?? 0)
      existing.total_shares += Number(m.shares ?? 0)
      existing.total_saves += Number(m.saves ?? 0)
      existing.total_emv += Number(m.emv ?? 0)
      existing.er_sum += Number(m.engagement_rate ?? 0)
      existing.er_count += 1
      // Track follower count from the most recently posted post
      const postedAt = (p as unknown as { posted_at: string }).posted_at
      if (
        m.follower_count != null &&
        (existing.latest_posted_at === null || postedAt > existing.latest_posted_at)
      ) {
        existing.latest_posted_at = postedAt
        existing.latest_follower_count = Number(m.follower_count)
      }
    }
    statsMap.set(key, existing)
  }
  const platformStats: InfluencerPlatformStats[] = Array.from(statsMap.entries()).map(([platform, s]) => ({
    platform: platform as Platform,
    post_count: s.post_count,
    total_views: s.total_views,
    total_likes: s.total_likes,
    total_comments: s.total_comments,
    total_shares: s.total_shares,
    total_saves: s.total_saves,
    latest_follower_count: s.latest_follower_count,
    total_emv: s.total_emv,
    avg_er: s.er_count > 0 ? s.er_sum / s.er_count : 0,
  }))

  const campaigns: InfluencerProfileCampaign[] = (membershipsResult.data ?? []).map((ci) => {
    const c = Array.isArray(ci.campaigns) ? ci.campaigns[0] : ci.campaigns
    return {
      campaign_influencer_id: ci.id,
      campaign_id: ci.campaign_id,
      name: c?.name ?? '—',
      status: (c?.status ?? 'draft') as CampaignStatus,
      platforms: (c?.platforms ?? []) as Platform[],
      monitoring_status: ci.monitoring_status as MonitoringStatus,
      usage_rights: ci.usage_rights,
      added_at: ci.added_at,
    }
  })

  const recentPosts: InfluencerProfilePost[] = (recentPostsResult.data ?? []).map((p) => {
    const m = Array.isArray(p.post_metrics) ? p.post_metrics[0] : p.post_metrics
    return {
      id: p.id,
      platform: p.platform as Platform,
      thumbnail_url: p.thumbnail_url,
      post_url: p.post_url,
      posted_at: p.posted_at,
      download_status: p.download_status as DownloadStatus,
      views: m ? Number(m.views) : null,
      emv: m ? Number(m.emv) : null,
    }
  })

  return { campaigns, platformStats, recentPosts }
}
