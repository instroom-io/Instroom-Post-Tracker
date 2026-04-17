import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { WORKSPACE_SLUG } from './test-data'

export { WORKSPACE_SLUG }

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars missing for E2E tests')
  return createSupabaseClient(url, key)
}

export const E2E_TAG = '[e2e]'

export async function getWorkspaceId(): Promise<string> {
  const sb = getClient()
  const { data, error } = await sb
    .from('workspaces')
    .select('id')
    .eq('slug', WORKSPACE_SLUG)
    .single()
  if (error || !data) throw new Error(`Workspace not found: ${error?.message}`)
  return data.id
}

export async function cleanupCampaigns(workspaceId: string) {
  const sb = getClient()
  await sb
    .from('campaigns')
    .delete()
    .eq('workspace_id', workspaceId)
    .ilike('name', `${E2E_TAG}%`)
}

export async function cleanupInfluencers(workspaceId: string) {
  const sb = getClient()
  const { data: influencers } = await sb
    .from('influencers')
    .select('id')
    .eq('workspace_id', workspaceId)
    .or(`full_name.ilike.${E2E_TAG}%,handle.ilike.e2e%`)
  if (influencers?.length) {
    await sb
      .from('campaign_influencers')
      .delete()
      .in('influencer_id', influencers.map((i) => i.id))
  }
  await sb
    .from('influencers')
    .delete()
    .eq('workspace_id', workspaceId)
    .or(`full_name.ilike.${E2E_TAG}%,handle.ilike.e2e%`)
}

export async function cleanupPosts(workspaceId: string) {
  const sb = getClient()
  await sb
    .from('posts')
    .delete()
    .eq('workspace_id', workspaceId)
    .ilike('caption', `${E2E_TAG}%`)
}

export async function seedCampaign(workspaceId: string): Promise<string> {
  const sb = getClient()
  const today = new Date().toISOString().split('T')[0]
  const future = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]
  const { data, error } = await sb
    .from('campaigns')
    .insert({
      workspace_id: workspaceId,
      name: `${E2E_TAG} Seeded Campaign`,
      platforms: ['tiktok'],
      status: 'draft',
      start_date: today,
      end_date: future,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Failed to seed campaign: ${error?.message}`)
  return data.id
}

export async function seedInfluencer(workspaceId: string): Promise<string> {
  const sb = getClient()
  const { data, error } = await sb
    .from('influencers')
    .insert({
      workspace_id: workspaceId,
      full_name: `${E2E_TAG} Test Influencer`,
      platform: 'tiktok',
      handle: 'e2e_playwright_handle',
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Failed to seed influencer: ${error?.message}`)
  return data.id
}

export async function seedCampaignInfluencer(campaignId: string, influencerId: string): Promise<string> {
  const sb = getClient()
  const { data, error } = await sb
    .from('campaign_influencers')
    .insert({
      campaign_id: campaignId,
      influencer_id: influencerId,
      monitoring_status: 'active',
      usage_rights_granted: false,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Failed to seed campaign influencer: ${error?.message}`)
  return data.id
}

export async function seedPost(workspaceId: string, campaignId: string, influencerId: string): Promise<string> {
  const sb = getClient()
  const { data, error } = await sb
    .from('posts')
    .insert({
      workspace_id: workspaceId,
      campaign_id: campaignId,
      influencer_id: influencerId,
      platform: 'tiktok',
      post_url: 'https://tiktok.com/@e2etest/video/99999999',
      caption: `${E2E_TAG} test post`,
      views: 1000,
      likes: 50,
      comments: 5,
      posted_at: new Date().toISOString(),
      download_status: 'pending',
      usage_rights_granted: false,
    })
    .select('id')
    .single()
  if (error || !data) throw new Error(`Failed to seed post: ${error?.message}`)
  return data.id
}

export async function getUsageRights(campaignInfluencerId: string): Promise<boolean> {
  const sb = getClient()
  const { data } = await sb
    .from('campaign_influencers')
    .select('usage_rights_granted')
    .eq('id', campaignInfluencerId)
    .single()
  return data?.usage_rights_granted ?? false
}
