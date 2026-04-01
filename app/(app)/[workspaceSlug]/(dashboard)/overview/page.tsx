import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { StatCards } from '@/components/dashboard/stat-cards'
import { StatCardsSkeleton } from '@/components/dashboard/stat-cards-skeleton'
import { CampaignsTable } from '@/components/dashboard/campaigns-table'
import { RecentPostsGrid } from '@/components/dashboard/recent-posts-grid'
import { OverviewBottomSkeleton } from '@/components/dashboard/overview-bottom-skeleton'
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
}

async function OverviewBottom({
  workspaceId,
  workspaceSlug,
}: {
  workspaceId: string
  workspaceSlug: string
}) {
  const supabase = await createClient()

  // Fetch campaigns and recent posts in parallel
  const [{ data: campaigns }, { data: recentPosts }] =
    await Promise.all([
      supabase
        .from('campaigns')
        .select('id, name, status, start_date, end_date')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(5),
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
      {/* Campaigns */}
      <div className="rounded-xl border border-border bg-background-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="font-display text-[15px] font-bold text-foreground">Campaigns</h2>
          <div className="flex items-center gap-3">
            <Link
              href={`/${workspaceSlug}/campaigns?new=1`}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background-muted px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-brand/40 hover:bg-brand/5 hover:text-brand"
            >
              + Add Campaign
            </Link>
            <Link href={`/${workspaceSlug}/campaigns`} className="text-[12px] text-brand hover:underline">
              View all
            </Link>
          </div>
        </div>
        <CampaignsTable campaigns={enrichedCampaigns} workspaceSlug={workspaceSlug} />
      </div>

      {/* Recent posts grid */}
      <div className="rounded-xl border border-border bg-background-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="font-display text-[15px] font-bold text-foreground">Recent posts</h2>
          <Link href={`/${workspaceSlug}/posts`} className="text-[12px] text-brand hover:underline">
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

  return (
    <div>
      <PageHeader title="Overview" description="Workspace summary and recent activity." />

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
            />
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </div>
  )
}
