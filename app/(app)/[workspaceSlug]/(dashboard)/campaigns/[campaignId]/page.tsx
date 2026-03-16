import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrackingConfigPanel } from '@/components/campaigns/tracking-config-panel'
import { CampaignInfluencersList } from '@/components/campaigns/campaign-influencers-list'
import { CampaignPostsTable } from '@/components/campaigns/campaign-posts-table'
import { formatDateRange } from '@/lib/utils'
import { updateCampaign } from '@/lib/actions/campaigns'
import type { WorkspaceRole, CampaignStatus, Platform } from '@/lib/types'

interface PageProps {
  params: Promise<{ workspaceSlug: string; campaignId: string }>
}

const statusVariant: Record<CampaignStatus, 'active' | 'draft' | 'ended'> = {
  active: 'active',
  draft: 'draft',
  ended: 'ended',
}

export default async function CampaignDetailPage({ params }: PageProps) {
  const { workspaceSlug, campaignId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', workspaceSlug)
    .single()
  if (!workspace) redirect('/app')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .single()

  const role = (member?.role ?? 'viewer') as WorkspaceRole
  const canEdit = ['owner', 'admin', 'editor'].includes(role)

  const [
    { data: campaign },
    { data: trackingConfigs },
    { data: influencers },
    { data: posts },
  ] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id, name, status, start_date, end_date, platforms, workspace_id')
      .eq('id', campaignId)
      .eq('workspace_id', workspace.id)
      .single(),
    supabase
      .from('campaign_tracking_configs')
      .select('*')
      .eq('campaign_id', campaignId),
    supabase
      .from('campaign_influencers')
      .select(
        'id, usage_rights, monitoring_status, influencer:influencers(id, full_name, ig_handle, tiktok_handle, youtube_handle)'
      )
      .eq('campaign_id', campaignId),
    supabase
      .from('posts')
      .select(
        'id, thumbnail_url, platform, posted_at, download_status, collab_status, influencer:influencers(full_name, ig_handle), metrics:post_metrics(views, engagement_rate, emv)'
      )
      .eq('campaign_id', campaignId)
      .order('posted_at', { ascending: false }),
  ])

  if (!campaign) redirect(`/${workspaceSlug}/campaigns`)

  async function activateCampaign() {
    'use server'
    await updateCampaign(workspace!.id, campaignId, { status: 'active' })
  }

  async function endCampaign() {
    'use server'
    await updateCampaign(workspace!.id, campaignId, { status: 'ended' })
  }

  return (
    <div>
      <PageHeader
        title={campaign.name}
        description={formatDateRange(campaign.start_date, campaign.end_date)}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant[campaign.status as CampaignStatus]}>
              {campaign.status}
            </Badge>
            {canEdit && campaign.status === 'draft' && (
              <form action={activateCampaign}>
                <Button type="submit" variant="primary" size="sm">
                  Activate
                </Button>
              </form>
            )}
            {canEdit && campaign.status === 'active' && (
              <form action={endCampaign}>
                <Button type="submit" variant="secondary" size="sm">
                  End campaign
                </Button>
              </form>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[1fr_280px]">
        {/* Main content */}
        <div className="space-y-5">
          {/* Posts table */}
          <div className="rounded-xl border border-border bg-background-surface shadow-sm">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="font-display text-[15px] font-bold text-foreground">
                Posts
              </h2>
            </div>
            <CampaignPostsTable
              posts={(posts ?? []).map((p) => ({
                id: p.id,
                thumbnail_url: p.thumbnail_url,
                platform: p.platform as Platform,
                posted_at: p.posted_at,
                download_status: p.download_status as import('@/lib/types').DownloadStatus,
                collab_status: p.collab_status as import('@/lib/types').CollabStatus,
                influencer: p.influencer as unknown as { full_name: string; ig_handle: string | null } | null,
                metrics: p.metrics as unknown as { views: number; engagement_rate: number; emv: number } | null,
              }))}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Influencers */}
          <div className="rounded-xl border border-border bg-background-surface shadow-sm">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="font-display text-[15px] font-bold text-foreground">
                Influencers
              </h2>
            </div>
            <CampaignInfluencersList
              items={(influencers ?? []).map((item) => ({
                id: item.id,
                usage_rights: item.usage_rights,
                monitoring_status: item.monitoring_status,
                influencer: item.influencer as unknown as {
                  id: string
                  full_name: string
                  ig_handle: string | null
                  tiktok_handle: string | null
                  youtube_handle: string | null
                },
              }))}
              workspaceId={workspace.id}
              campaignId={campaignId}
              canEdit={canEdit}
            />
          </div>

          {/* Tracking config */}
          <div className="rounded-xl border border-border bg-background-surface shadow-sm">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="font-display text-[15px] font-bold text-foreground">
                Tracking config
              </h2>
            </div>
            <TrackingConfigPanel
              campaignId={campaignId}
              workspaceId={workspace.id}
              platforms={campaign.platforms as Platform[]}
              configs={trackingConfigs ?? []}
              canEdit={canEdit}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
