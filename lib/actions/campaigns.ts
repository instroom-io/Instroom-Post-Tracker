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

  const { error } = await supabase.from('campaigns').insert({
    workspace_id: workspaceId,
    name: parsed.data.name,
    platforms: parsed.data.platforms,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
    created_by: user.id,
  })

  if (error) return { error: 'Failed to create campaign.' }

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
  return updateCampaign(workspaceId, campaignId, { status: 'ended' })
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
