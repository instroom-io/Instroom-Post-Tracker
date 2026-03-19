import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ agencySlug: string }>
}

export default async function AgencyDashboardPage({ params }: PageProps) {
  const { agencySlug } = await params
  const supabase = await createClient()

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name')
    .eq('slug', agencySlug)
    .single()

  if (!agency) redirect('/app')

  const [
    { data: workspaces, count: brandCount },
    { data: pendingRequests },
  ] = await Promise.all([
    supabase.from('workspaces').select('id, name, slug, created_at', { count: 'exact' }).eq('agency_id', agency.id),
    supabase.from('brand_requests').select('id, brand_name, contact_email, created_at').eq('agency_id', agency.id).eq('status', 'pending').limit(5),
  ])

  const workspaceIds = workspaces?.map((w) => w.id) ?? []
  const { count: postCount } = workspaceIds.length > 0
    ? await supabase.from('posts').select('*', { count: 'exact', head: true }).in('workspace_id', workspaceIds)
    : { count: 0 }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">{agency.name}</h1>
        <p className="text-sm text-muted-foreground">Agency Dashboard</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { label: 'Brand Clients', value: brandCount ?? 0 },
          { label: 'Total Posts', value: postCount ?? 0 },
          { label: 'Pending Requests', value: pendingRequests?.length ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-background-surface p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {(pendingRequests ?? []).length > 0 && (
        <div className="rounded-xl border border-border bg-background-surface p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Pending Brand Requests</h2>
            <a href={`/agency/${agencySlug}/requests`} className="text-xs text-muted-foreground hover:text-foreground">View all →</a>
          </div>
          <div className="flex flex-col gap-2">
            {pendingRequests!.map((req) => (
              <div key={req.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{req.brand_name}</p>
                  <p className="text-[11px] text-muted-foreground">{req.contact_email}</p>
                </div>
                <a href={`/agency/${agencySlug}/requests`} className="text-xs text-primary hover:underline">Review →</a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-background-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Brand Workspaces</h2>
          <a href={`/agency/${agencySlug}/brands`} className="text-xs text-muted-foreground hover:text-foreground">View all →</a>
        </div>
        {(workspaces ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No brand workspaces yet. Approve a brand request to add one.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {workspaces!.slice(0, 5).map((w) => (
              <a key={w.id} href={`/${w.slug}/overview`} className="flex items-center justify-between rounded-lg border border-border px-4 py-2 hover:border-foreground/20 transition-colors">
                <p className="text-sm font-medium text-foreground">{w.name}</p>
                <p className="text-[11px] text-muted-foreground">{w.slug}</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
