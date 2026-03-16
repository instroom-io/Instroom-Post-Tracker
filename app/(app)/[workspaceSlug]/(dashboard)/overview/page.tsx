import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { StatCards } from '@/components/dashboard/stat-cards'
import { StatCardsSkeleton } from '@/components/dashboard/stat-cards-skeleton'
import { CampaignsTable } from '@/components/dashboard/campaigns-table'
import { RecentPostsGrid } from '@/components/dashboard/recent-posts-grid'
import { UsageRightsPanel } from '@/components/dashboard/usage-rights-panel'
import type { WorkspaceRole } from '@/lib/types'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
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

  // Fetch overview data in parallel
  const [
    { data: campaigns },
    { data: recentPosts },
    { data: usageRightsItems },
  ] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id, name, status, start_date, end_date')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('posts')
      .select('id, thumbnail_url, platform, posted_at, influencer:influencers(full_name)')
      .eq('workspace_id', workspace.id)
      .order('detected_at', { ascending: false })
      .limit(8),
    supabase
      .from('campaign_influencers')
      .select(
        'id, usage_rights, influencer:influencers(full_name, ig_handle), campaign:campaigns(name)'
      )
      .in(
        'campaign_id',
        (
          await supabase
            .from('campaigns')
            .select('id')
            .eq('workspace_id', workspace.id)
            .eq('status', 'active')
        ).data?.map((c) => c.id) ?? []
      )
      .order('added_at', { ascending: false })
      .limit(20),
  ])

  // Enrich campaigns with post counts
  const campaignIds = (campaigns ?? []).map((c) => c.id)
  const postCountMap: Record<string, number> = {}
  if (campaignIds.length > 0) {
    const { data: postCounts } = await supabase
      .from('posts')
      .select('campaign_id')
      .in('campaign_id', campaignIds)

    ;(postCounts ?? []).forEach((p) => {
      postCountMap[p.campaign_id] = (postCountMap[p.campaign_id] ?? 0) + 1
    })
  }

  const enrichedCampaigns = (campaigns ?? []).map((c) => ({
    ...c,
    post_count: postCountMap[c.id] ?? 0,
  }))

  return (
    <div>
      <PageHeader title="Overview" />

      <div className="space-y-5 p-5">
        {/* Stat cards */}
        <Suspense fallback={<StatCardsSkeleton />}>
          <StatCards workspaceId={workspace.id} />
        </Suspense>

        {/* Campaigns + Usage rights */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
          {/* Campaigns table */}
          <div className="rounded-xl border border-border bg-background-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="font-display text-[15px] font-bold text-foreground">
                Campaigns
              </h2>
              <a
                href={`/${workspaceSlug}/campaigns`}
                className="text-[12px] text-brand hover:underline"
              >
                View all
              </a>
            </div>
            <CampaignsTable
              campaigns={enrichedCampaigns}
              workspaceSlug={workspaceSlug}
            />
          </div>

          {/* Usage rights panel */}
          <div className="rounded-xl border border-border bg-background-surface shadow-sm">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="font-display text-[15px] font-bold text-foreground">
                Usage rights
              </h2>
              <p className="text-[11px] text-foreground-lighter">Active campaigns</p>
            </div>
            <UsageRightsPanel
              items={(usageRightsItems ?? []).map((item) => ({
                id: item.id,
                usage_rights: item.usage_rights,
                influencer: item.influencer as unknown as {
                  full_name: string
                  ig_handle: string | null
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
            <h2 className="font-display text-[15px] font-bold text-foreground">
              Recent posts
            </h2>
            <a
              href={`/${workspaceSlug}/posts`}
              className="text-[12px] text-brand hover:underline"
            >
              View all
            </a>
          </div>
          <div className="p-5">
            <RecentPostsGrid
              posts={(recentPosts ?? []).map((p) => ({
                id: p.id,
                thumbnail_url: p.thumbnail_url,
                platform: p.platform,
                posted_at: p.posted_at,
                influencer: p.influencer as unknown as { full_name: string } | null,
              }))}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
