'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  createCampaignSchema,
  updateCampaignSchema,
  trackingConfigSchema,
} from '@/lib/validations'
import type { UpdateCampaignInput } from '@/lib/validations'

export async function createCampaign(
  workspaceId: string,
  data: unknown
): Promise<{ error: string } | void> {
  const parsed = createCampaignSchema.safeParse(data)
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

  const { data: campaign, error } = await supabase.from('campaigns').insert({
    workspace_id: workspaceId,
    name: parsed.data.name,
    platforms: parsed.data.platforms,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
    created_by: user.id,
  }).select('id').single()

  if (error || !campaign) return { error: 'Failed to create campaign.' }

  if (parsed.data.tracking_configs && parsed.data.tracking_configs.length > 0) {
    const configRows = parsed.data.tracking_configs.map((tc) => ({
      campaign_id: campaign.id,
      platform: tc.platform,
      hashtags: tc.hashtags,
      mentions: tc.mentions,
    }))
    await supabase.from('campaign_tracking_configs').upsert(configRows, { onConflict: 'campaign_id,platform' })
  }

  revalidatePath('/', 'layout')
}

export async function updateCampaign(
  workspaceId: string,
  campaignId: string,
  data: UpdateCampaignInput
): Promise<{ error: string } | void> {
  const parsed = updateCampaignSchema.safeParse(data)
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

  const { error } = await supabase
    .from('campaigns')
    .update(parsed.data)
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)

  if (error) return { error: 'Failed to update campaign.' }

  revalidatePath('/', 'layout')
}

export async function archiveCampaign(
  workspaceId: string,
  campaignId: string
): Promise<{ error: string } | void> {
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

  const { error } = await supabase
    .from('campaigns')
    .update({ status: 'archived' })
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)
  if (error) return { error: 'Failed to archive campaign.' }

  revalidatePath('/', 'layout')
}

export async function restoreCampaign(
  workspaceId: string,
  campaignId: string
): Promise<{ error: string } | void> {
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

  const { error } = await supabase
    .from('campaigns')
    .update({ status: 'draft' })
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)
  if (error) return { error: 'Failed to restore campaign.' }

  revalidatePath('/', 'layout')
}

export async function deleteCampaign(
  workspaceId: string,
  campaignId: string
): Promise<{ error: string } | void> {
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

  const { count } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('workspace_id', workspaceId)
  if ((count ?? 0) > 0) return { error: 'Cannot delete a campaign that has posts.' }

  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId)
    .eq('workspace_id', workspaceId)
  if (error) return { error: 'Failed to delete campaign.' }

  revalidatePath('/', 'layout')
}

export async function upsertTrackingConfig(
  workspaceId: string,
  data: unknown
): Promise<{ error: string } | void> {
  const parsed = trackingConfigSchema.safeParse(data)
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

  const { error } = await supabase.from('campaign_tracking_configs').upsert(
    {
      campaign_id: parsed.data.campaign_id,
      platform: parsed.data.platform,
      hashtags: parsed.data.hashtags,
      mentions: parsed.data.mentions,
    },
    { onConflict: 'campaign_id,platform' }
  )

  if (error) return { error: 'Failed to save tracking config.' }

  revalidatePath('/', 'layout')
}
