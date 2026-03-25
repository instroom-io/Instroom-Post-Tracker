import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreateWorkspaceDialog } from '@/components/agency/create-workspace-dialog'

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

  const { data: workspaces, count: workspaceCount } = await supabase
    .from('workspaces')
    .select('id, name, slug, logo_url, created_at', { count: 'exact' })
    .eq('agency_id', agency.id)

  const workspaceIds = workspaces?.map((w) => w.id) ?? []
  const { count: postCount } = await (
    workspaceIds.length > 0
      ? supabase.from('posts').select('*', { count: 'exact', head: true }).in('workspace_id', workspaceIds)
      : Promise.resolve({ count: 0 })
  )

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">{agency.name}</h1>
        <p className="text-[13px] text-foreground-lighter">Agency Dashboard</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        {[
          { label: 'Workspaces', value: workspaceCount ?? 0 },
          { label: 'Total Posts', value: postCount ?? 0 },
        ].map((stat, i) => (
          <div key={stat.label} className={`rounded-xl border border-border bg-background-surface p-4 shadow-md animate-fade-up animate-fade-up-delay-${i + 1}`}>
            <p className="text-[11px] uppercase tracking-wide text-foreground-muted">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-background-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-foreground">Workspaces</h2>
          <CreateWorkspaceDialog agencyId={agency.id} />
        </div>
        {(workspaces ?? []).length === 0 ? (
          <p className="text-[13px] text-foreground-lighter">No workspaces yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {workspaces!.slice(0, 5).map((w) => (
              <a key={w.id} href={`/${w.slug}/overview`} className="flex items-center gap-3 rounded-lg border border-border px-4 py-2 hover:border-foreground/20 transition-colors">
                {w.logo_url ? (
                  <img src={w.logo_url} alt={w.name} className="h-7 w-7 flex-shrink-0 rounded-md object-cover" />
                ) : (
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-border bg-background-subtle text-[11px] font-semibold uppercase text-foreground-muted">
                    {w.name.slice(0, 2)}
                  </div>
                )}
                <p className="flex-1 text-[13px] font-medium text-foreground">{w.name}</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
