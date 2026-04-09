import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CaretLeft } from '@phosphor-icons/react/dist/ssr'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { AnimatedBadge } from '@/components/ui/animated-badge'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { CampaignTabs } from '@/components/campaigns/campaign-tabs'
import { CampaignTourWrapper, CampaignTourButton } from '@/components/campaigns/campaign-tour-wrapper'
import { formatDateRange } from '@/lib/utils'
import { updateCampaign } from '@/lib/actions/campaigns'
import type { WorkspaceRole, CampaignStatus, Platform, DownloadStatus } from '@/lib/types'

interface PageProps {
  params: Promise<{ workspaceSlug: string; campaignId: string }>
  searchParams: Promise<{ tab?: string }>
}

const statusVariant: Record<CampaignStatus, 'active' | 'draft' | 'ended'> = {
  active: 'active',
  draft: 'draft',
  ended: 'ended',
  archived: 'ended',
}

const VALID_TABS = ['overview', 'influencers', 'posts', 'downloads'] as const
type Tab = typeof VALID_TABS[number]

export default async function CampaignDetailPage({ params, searchParams }: PageProps) {
  const { workspaceSlug, campaignId } = await params
  const { tab } = await searchParams
  const defaultTab: Tab = VALID_TABS.includes(tab as Tab) ? (tab as Tab) : 'overview'
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
    .select('role, drive_folder_id')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .single()

  const role = (member?.role ?? 'viewer') as WorkspaceRole
  const memberDriveUrl = member?.drive_folder_id
    ? `https://drive.google.com/drive/folders/${member.drive_folder_id}`
    : undefined
  const canEdit = ['owner', 'admin', 'editor'].includes(role)

  const [
    { data: campaign },
    { data: trackingConfigs },
    { data: influencers },
    { data: posts },
    { data: workspaceInfluencers },
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
        'id, usage_rights, monitoring_status, product_sent_at, added_at, follow_up_1_sent_at, follow_up_2_sent_at, influencer:influencers(id, ig_handle, tiktok_handle, youtube_handle, profile_pic_url)'
      )
      .eq('campaign_id', campaignId)
      .neq('monitoring_status', 'removed'),
    supabase
      .from('posts')
      .select(
        'id, influencer_id, thumbnail_url, media_url, platform, posted_at, download_status, drive_file_id, caption, post_url, influencer:influencers(tiktok_handle, ig_handle, youtube_handle), metrics:post_metrics(views, likes, comments, shares, saves, follower_count, engagement_rate, emv)'
      )
      .eq('campaign_id', campaignId)
      .order('posted_at', { ascending: false })
      .limit(300),
    supabase
      .from('influencers')
      .select('id, ig_handle, tiktok_handle, youtube_handle')
      .eq('workspace_id', workspace.id)
      .limit(200),
  ])

  if (!campaign) redirect(`/${workspaceSlug}/campaigns`)

  // Pre-filter downloaded posts (no extra DB query needed)
  const downloadedPosts = (posts ?? []).filter((p) => p.download_status === 'downloaded')

  // Build post count map per influencer for zero-post warning
  const postCountsByInfluencerId = (posts ?? []).reduce<Record<string, number>>((acc, p) => {
    const infId = (p as unknown as { influencer_id: string }).influencer_id
    if (infId) acc[infId] = (acc[infId] ?? 0) + 1
    return acc
  }, {})

  const today = new Date().toISOString().split('T')[0]

  const missingPlatforms = (campaign.platforms as string[]).filter((platform) => {
    const config = trackingConfigs?.find((c) => c.platform === platform)
    return !config || !config.hashtags?.length || !config.mentions?.length
  })
  const canActivate = missingPlatforms.length === 0

  const endDateBlocking =
    campaign.end_date !== null && campaign.end_date < today

  async function activateCampaign() {
    'use server'
    // Re-fetch inside the action — never rely on RSC closure variables for security guards.
    // Note: return values from <form action={fn}> are discarded by Next.js.
    // Client-side disabled state handles UX; this guard stops bypassed requests.
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    const [{ data: freshCampaign }, { data: configs }] = await Promise.all([
      supabase
        .from('campaigns')
        .select('platforms, end_date')
        .eq('id', campaignId)
        .single(),
      supabase
        .from('campaign_tracking_configs')
        .select('platform, hashtags, mentions')
        .eq('campaign_id', campaignId),
    ])

    if (!freshCampaign) return

    const incomplete = (freshCampaign.platforms as string[]).filter((platform) => {
      const config = configs?.find((c) => c.platform === platform)
      return !config || !config.hashtags?.length || !config.mentions?.length
    })
    if (incomplete.length > 0) return

    if (freshCampaign.end_date && freshCampaign.end_date < today) return

    await updateCampaign(workspace!.id, campaignId, { status: 'active' })
  }

  async function endCampaign() {
    'use server'
    await updateCampaign(workspace!.id, campaignId, { status: 'ended' })
  }

  const typedPosts = (posts ?? []).map((p) => {
    const m = p.metrics as unknown as Record<string, unknown> | null
    return {
      id: p.id,
      thumbnail_url: p.thumbnail_url,
      media_url: (p as unknown as { media_url: string | null }).media_url,
      caption: p.caption,
      post_url: p.post_url,
      platform: p.platform as Platform,
      posted_at: p.posted_at,
      download_status: p.download_status as DownloadStatus,
      drive_file_id: (p as unknown as { drive_file_id: string | null }).drive_file_id,
      influencer: p.influencer as unknown as { tiktok_handle: string | null; ig_handle: string | null; youtube_handle: string | null } | null,
      metrics: m
        ? {
            views: Number(m.views),
            likes: Number(m.likes),
            comments: Number(m.comments),
            shares: Number(m.shares),
            saves: m.saves != null ? Number(m.saves) : null,
            follower_count: Number(m.follower_count),
            engagement_rate: Number(m.engagement_rate),
            emv: Number(m.emv),
          }
        : null,
    }
  })

  const typedDownloadedPosts = typedPosts.filter((p) => p.download_status === 'downloaded')

  const typedInfluencers = (influencers ?? []).map((item) => ({
    id: item.id,
    usage_rights: item.usage_rights,
    monitoring_status: item.monitoring_status,
    product_sent_at: (item.product_sent_at as string | null) ?? null,
    added_at: (item.added_at as string),
    follow_up_1_sent_at: (item.follow_up_1_sent_at as string | null) ?? null,
    follow_up_2_sent_at: (item.follow_up_2_sent_at as string | null) ?? null,
    influencer: item.influencer as unknown as {
      id: string
      ig_handle: string | null
      tiktok_handle: string | null
      youtube_handle: string | null
      profile_pic_url: string | null
    },
  }))

  return (
    <CampaignTourWrapper>
    <div>
      <Link
        href={`/${workspaceSlug}/campaigns`}
        className="flex items-center gap-1 px-5 pt-4 pb-1 text-[12px] text-foreground-muted hover:text-foreground transition-colors w-fit"
      >
        <CaretLeft size={13} />
        Campaigns
      </Link>
      <PageHeader
        title={campaign.name}
        description={formatDateRange(campaign.start_date, campaign.end_date)}
        actions={
          <div data-tour="campaign-status" className="flex items-center gap-2">
            <CampaignTourButton />
            {campaign.status === 'active' ? (
              <AnimatedBadge className="capitalize">{campaign.status}</AnimatedBadge>
            ) : (
              <Badge variant={statusVariant[campaign.status as CampaignStatus]} className="capitalize">
                {campaign.status}
              </Badge>
            )}
            {canEdit && (campaign.status === 'draft' || campaign.status === 'ended') && (() => {
              const tooltipMsg = !canActivate
                ? `Complete tracking config (# and @) for: ${missingPlatforms.join(', ')}`
                : endDateBlocking
                ? 'End date has passed — update or clear it before re-activating'
                : null

              const button = (
                <form action={activateCampaign}>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!canActivate || endDateBlocking}
                  >
                    {campaign.status === 'ended' ? 'Re-activate' : 'Activate'}
                  </Button>
                </form>
              )

              return tooltipMsg ? (
                <Tooltip content={tooltipMsg}>{button}</Tooltip>
              ) : button
            })()}
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

      <div className="rounded-xl border border-border bg-background-surface shadow-sm mx-5 mb-5">
        <CampaignTabs
          posts={typedPosts}
          downloadedPosts={typedDownloadedPosts}
          influencers={typedInfluencers}
          workspaceInfluencers={workspaceInfluencers ?? []}
          trackingConfigs={trackingConfigs ?? []}
          workspaceId={workspace.id}
          campaignId={campaignId}
          campaignStatus={campaign.status}
          campaignPlatforms={campaign.platforms as Platform[]}
          canEdit={canEdit}
          postCountsByInfluencerId={postCountsByInfluencerId}
          memberDriveUrl={memberDriveUrl}
          defaultTab={defaultTab}
        />
      </div>
    </div>
    </CampaignTourWrapper>
  )
}
