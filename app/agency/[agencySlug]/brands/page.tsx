import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ agencySlug: string }>
}

export default async function AgencyBrandsPage({ params }: PageProps) {
  const { agencySlug } = await params
  const supabase = await createClient()

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name')
    .eq('slug', agencySlug)
    .single()

  if (!agency) redirect('/app')

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name, slug, created_at, drive_connection_type')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-foreground">Brand Clients</h1>
      {(workspaces ?? []).length === 0 ? (
        <p className="text-[13px] text-foreground-lighter">No brand workspaces yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {workspaces!.map((w) => (
            <a
              key={w.id}
              href={`/${w.slug}/overview`}
              className="flex items-center justify-between rounded-xl border border-border bg-background-surface px-5 py-3 hover:border-foreground/20 transition-colors"
            >
              <div>
                <p className="text-[13px] font-semibold text-foreground">{w.name}</p>
                <p className="text-[11px] text-foreground-lighter">{w.slug} · Drive: {w.drive_connection_type ?? 'not set'}</p>
              </div>
              <span className="text-[12px] text-foreground-lighter">Open workspace →</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
