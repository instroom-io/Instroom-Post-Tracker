import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ agencyId: string }>
}

export default async function AgencyDetailPage({ params }: PageProps) {
  const { agencyId } = await params
  const supabase = await createClient()

  // Sequential: workspaces needed before post count query
  const [{ data: agency }, { data: workspaces }] = await Promise.all([
    supabase.from('agencies').select('*').eq('id', agencyId).single(),
    supabase.from('workspaces').select('id, name, slug, created_at').eq('agency_id', agencyId),
  ])

  if (!agency) redirect('/admin/agencies')

  const workspaceIds = workspaces?.map((w) => w.id) ?? []
  const { count: postCount } = workspaceIds.length > 0
    ? await supabase.from('posts').select('*', { count: 'exact', head: true }).in('workspace_id', workspaceIds)
    : { count: 0 }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <a href="/admin/agencies" className="text-xs text-muted-foreground hover:text-foreground">← All agencies</a>
        <h1 className="mt-1 text-xl font-bold text-foreground">{agency.name}</h1>
        <p className="text-sm text-muted-foreground">{agency.slug} · {agency.status}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Brand Clients', value: workspaces?.length ?? 0 },
          { label: 'Total Posts', value: postCount ?? 0 },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-background-surface p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-background-surface p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Brand Workspaces</h2>
        {(workspaces ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No brand workspaces yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {workspaces!.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-2">
                <p className="text-sm font-medium text-foreground">{w.name}</p>
                <p className="text-[11px] text-muted-foreground">{w.slug}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
