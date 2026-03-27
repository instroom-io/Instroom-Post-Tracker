import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { StatCards } from '@/components/dashboard/stat-cards'
import { StatCardsSkeleton } from '@/components/dashboard/stat-cards-skeleton'
import { CampaignsTable } from '@/components/dashboard/campaigns-table'
import { RecentPostsGrid } from '@/components/dashboard/recent-posts-grid'
import { UsageRightsPanel } from '@/components/dashboard/usage-rights-panel'
import { OverviewBottomSkeleton } from '@/components/dashboard/overview-bottom-skeleton'
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary'
import type { WorkspaceRole } from '@/lib/types'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
}

async function OverviewBottom({
  workspaceId,
  workspaceSlug,
  canEdit,
}: {
  workspaceId: string
  workspaceSlug: string
  canEdit: boolean
}) {
  const supabase = await createClient()

  // Resolve active campaign IDs first (needed by campaign_influencers query)
  const { data: activeCampaigns } = await supabase
    .from('campaigns')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'active')
  const activeCampaignIds = activeCampaigns?.map((c) => c.id) ?? []

  // Fetch campaigns, usage rights, recent posts in parallel
  const [{ data: campaigns }, { data: usageRightsItems }, { data: recentPosts }] =
    await Promise.all([
      supabase
        .from('campaigns')
        .select('id, name, status, start_date, end_date')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('campaign_influencers')
        .select(
          'id, usage_rights, influencer:influencers(tiktok_handle, ig_handle, youtube_handle, profile_pic_url), campaign:campaigns(name)'
        )
        .in('campaign_id', activeCampaignIds)
        .neq('monitoring_status', 'removed')
        .order('added_at', { ascending: false })
        .limit(20),
      supabase
        .from('posts')
        .select(
          'id, thumbnail_url, platform, posted_at, influencer:influencers(tiktok_handle, ig_handle, youtube_handle)'
        )
        .eq('workspace_id', workspaceId)
        .order('detected_at', { ascending: false })
        .limit(8),
    ])

  // Enrich campaigns with post counts
  const campaignIds = (campaigns ?? []).map((c) => c.id)
  const postCountMap: Record<string, number> = {}
  if (campaignIds.length > 0) {
    const { data: postCounts } = await supabase
      .from('posts')
      .select('campaign_id')
      .in('campaign_id', campaignIds)
      .limit(500)

    ;(postCounts ?? []).forEach((p) => {
      postCountMap[p.campaign_id] = (postCountMap[p.campaign_id] ?? 0) + 1
    })
  }

  const enrichedCampaigns = (campaigns ?? []).map((c) => ({
    ...c,
    post_count: postCountMap[c.id] ?? 0,
  }))

  return (
    <>
      {/* Campaigns + Usage rights */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-border bg-background-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <h2 className="font-display text-[15px] font-bold text-foreground">Campaigns</h2>
            <Link href={`/${workspaceSlug}/campaigns`} className="text-[12px] text-brand hover:underline">
              View all
            </Link>
          </div>
          <CampaignsTable campaigns={enrichedCampaigns} workspaceSlug={workspaceSlug} />
        </div>

        <div className="rounded-xl border border-border bg-background-surface shadow-sm">
          <div className="border-b border-border px-5 py-3.5">
            <h2 className="font-display text-[15px] font-bold text-foreground">Usage rights</h2>
            <p className="text-[11px] text-foreground-lighter">Active campaigns</p>
          </div>
          <UsageRightsPanel
            items={(usageRightsItems ?? []).map((item) => ({
              id: item.id,
              usage_rights: item.usage_rights,
              influencer: item.influencer as unknown as {
                tiktok_handle: string | null
                ig_handle: string | null
                youtube_handle: string | null
                profile_pic_url: string | null
              } | null,
              campaign: item.campaign as unknown as { name: string } | null,
            }))}
            canEdit={canEdit}
          />
        </div>
      </div>

      {/* Recent posts grid */}
      <div className="rounded-xl border border-border bg-background-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="font-display text-[15px] font-bold text-foreground">Recent posts</h2>
          <Link href={`/${workspaceSlug}/campaigns`} className="text-[12px] text-brand hover:underline">
            View all
          </Link>
        </div>
        <div className="p-5">
          <RecentPostsGrid
            posts={(recentPosts ?? []).map((p) => ({
              id: p.id,
              thumbnail_url: p.thumbnail_url,
              platform: p.platform,
              posted_at: p.posted_at,
              influencer: p.influencer as unknown as {
                tiktok_handle: string | null
                ig_handle: string | null
                youtube_handle: string | null
              } | null,
            }))}
          />
        </div>
      </div>
    </>
  )
}

export default async function OverviewPage({ params }: PageProps) {
  const { workspaceSlug } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name')
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

  return (
    <div>
      <PageHeader title="Overview" />

      <div className="space-y-5 p-5">
        {/* Stat cards stream in first */}
        <SectionErrorBoundary>
          <Suspense fallback={<StatCardsSkeleton />}>
            <StatCards workspaceId={workspace.id} />
          </Suspense>
        </SectionErrorBoundary>

        {/* Bottom grid streams in independently */}
        <SectionErrorBoundary>
          <Suspense fallback={<OverviewBottomSkeleton />}>
            <OverviewBottom
              workspaceId={workspace.id}
              workspaceSlug={workspaceSlug}
              canEdit={canEdit}
            />
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </div>
  )
}
