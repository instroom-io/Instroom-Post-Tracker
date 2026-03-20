'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { addInfluencerSchema, updateInfluencerSchema } from '@/lib/validations'

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

  const { data: influencer, error } = await supabase
    .from('influencers')
    .insert({
      workspace_id: workspaceId,
      ig_handle: parsed.data.ig_handle || null,
      tiktok_handle: parsed.data.tiktok_handle || null,
      youtube_handle: parsed.data.youtube_handle || null,
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
  campaignId?: string
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

  const rows = deduped.map((handle) => ({
    workspace_id: workspaceId,
    ig_handle: platform === 'instagram' ? handle : null,
    tiktok_handle: platform === 'tiktok' ? handle : null,
    youtube_handle: platform === 'youtube' ? handle : null,
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
    }))
    await supabase.from('campaign_influencers').insert(campaignRows)
  }

  revalidatePath('/', 'layout')
  return { added, skipped }
}

export async function addInfluencerToCampaign(
  workspaceId: string,
  campaignId: string,
  influencerId: string
): Promise<{ error: string } | void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('campaign_influencers').insert({
    campaign_id: campaignId,
    influencer_id: influencerId,
    added_by: user.id,
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'This influencer is already in this campaign.' }
    }
    return { error: 'Failed to add influencer to campaign.' }
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
    .delete()
    .eq('id', campaignInfluencerId)

  if (error) return { error: 'Failed to remove influencer.' }

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
