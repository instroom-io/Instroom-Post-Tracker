import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InviteBrandDialog } from '@/components/agency/invite-brand-dialog'

interface PageProps {
  params: Promise<{ agencySlug: string }>
  searchParams: Promise<{ invite?: string }>
}

export default async function AgencyDashboardPage({ params, searchParams }: PageProps) {
  const { agencySlug } = await params
  const { invite } = await searchParams
  const supabase = await createClient()

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name')
    .eq('slug', agencySlug)
    .single()

  if (!agency) redirect('/app')

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name, slug, logo_url, created_at')
    .eq('agency_id', agency.id)

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl border border-border bg-background-surface p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-foreground">Workspaces</h2>
          <InviteBrandDialog agencyId={agency.id} defaultOpen={invite === '1'} />
        </div>
        {(workspaces ?? []).length === 0 ? (
          <p className="text-[13px] text-foreground-lighter">No workspaces yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {workspaces!.slice(0, 5).map((w) => (
              <a key={w.id} href={`/${w.slug}/overview`} className="flex items-center gap-3 rounded-lg border border-border px-4 py-2 hover:border-foreground/20 transition-colors">
                {w.logo_url ? (
                  <img src={w.logo_url} alt={w.name} className="h-7 w-7 flex-shrink-0 rounded-md object-contain" />
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
