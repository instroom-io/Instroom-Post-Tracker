'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { addInfluencerSchema, updateInfluencerSchema, updateProductSentAtSchema, type UpdateProductSentAtInput } from '@/lib/validations'

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
      const picUrl = json.data?.profile_pic_url as string | undefined
      // Proxy through our server — Instagram CDN blocks direct browser requests
      const profile_pic_url = picUrl
        ? `/api/proxy-image?url=${encodeURIComponent(picUrl)}`
        : null
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

  if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  // Fetch profile pic from whichever platform handle is present
  const platform = parsed.data.tiktok_handle ? 'tiktok'
    : parsed.data.ig_handle ? 'instagram'
    : 'youtube'
  const handle = parsed.data.tiktok_handle || parsed.data.ig_handle || parsed.data.youtube_handle || ''
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

  // Optionally add to campaign
  if (campaignId) {
    const result = await addInfluencerToCampaign(workspaceId, campaignId, influencer.id)
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

  if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
    return { error: 'Insufficient permissions.', added: 0, skipped: 0 }
  }

  const deduped = [...new Set(handles.map((h) => h.trim()).filter(Boolean))]
  if (deduped.length === 0) return { error: 'No valid handles provided.', added: 0, skipped: 0 }

  const profiles = await Promise.all(deduped.map((handle) => fetchProfileInfo(platform, handle)))

  const rows = deduped.map((handle, i) => ({
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

  const insertedIds = (inserted ?? []).map((r) => r.id)
  const added = insertedIds.length
  const skipped = deduped.length - added

  if (campaignId && insertedIds.length > 0) {
    const campaignRows = insertedIds.map((influencer_id) => ({
      campaign_id: campaignId,
      influencer_id,
      added_by: user.id,
      ...(productSentAt ? { product_sent_at: productSentAt } : {}),
    }))
    await supabase.from('campaign_influencers').insert(campaignRows)
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
  campaignInfluencerId: string
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('campaign_influencers')
    .update({ monitoring_status: 'removed' })
    .eq('id', campaignInfluencerId)

  if (error) return { error: 'Failed to remove influencer.' }

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

  if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
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

  await supabase
    .from('influencers')
    .update({ profile_pic_url })
    .eq('id', influencerId)
    .eq('workspace_id', workspaceId)

  revalidatePath('/', 'layout')
  return { profile_pic_url }
}
