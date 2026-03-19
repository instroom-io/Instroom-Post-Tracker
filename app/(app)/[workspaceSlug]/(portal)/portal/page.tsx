import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DriveStatusBanner } from '@/components/portal/drive-status-banner'
import { BrandPortalPosts } from '@/components/portal/brand-portal-posts'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function BrandPortalPage({ params }: PageProps) {
  const { workspaceSlug } = await params
  const supabase = await createClient()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name, drive_folder_id, drive_connection_type, agency_id')
    .eq('slug', workspaceSlug)
    .single()

  if (!workspace) redirect('/app')

  // Fetch agency name
  let agencyName: string | null = null
  if (workspace.agency_id) {
    const { data: agency } = await supabase.from('agencies').select('name').eq('id', workspace.agency_id).single()
    agencyName = agency?.name ?? null
  }

  // Stats — single fetch for posts with count, then metrics
  const { data: workspacePosts, count: postCount } = await supabase
    .from('posts')
    .select('id', { count: 'exact' })
    .eq('workspace_id', workspace.id)
    .eq('download_status', 'downloaded')

  const postIds = workspacePosts?.map((p) => p.id) ?? []

  const { data: metricsRows } = await (
    postIds.length > 0
      ? supabase.from('post_metrics').select('emv, views').in('post_id', postIds)
      : Promise.resolve({ data: [] as { emv: number | null; views: number | null }[] })
  )

  const metricsRowsSafe = metricsRows ?? []
  const totalEmv = metricsRowsSafe.reduce((sum, r) => sum + (r.emv ?? 0), 0)
  const totalReach = metricsRowsSafe.reduce((sum, r) => sum + (r.views ?? 0), 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">My Content</h1>
        <p className="text-sm text-muted-foreground">Influencer posts downloaded for {workspace.name}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Posts Downloaded', value: (postCount ?? 0).toLocaleString() },
          { label: 'Total Reach', value: totalReach >= 1000 ? `${(totalReach / 1000).toFixed(0)}K` : totalReach.toString() },
          { label: 'EMV', value: totalEmv >= 1000 ? `€${(totalEmv / 1000).toFixed(1)}K` : `€${totalEmv.toFixed(0)}` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-background-surface p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <DriveStatusBanner
        driveConnectionType={workspace.drive_connection_type as 'agency' | 'brand' | null}
        driveFolderId={workspace.drive_folder_id}
        agencyName={agencyName}
      />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Recent Posts</h2>
        <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-background-surface" />}>
          <BrandPortalPosts workspaceId={workspace.id} />
        </Suspense>
      </div>
    </div>
  )
}
