import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'

interface PageProps {
  params: Promise<{ agencySlug: string }>
}

export default async function AgencyBrandsPage({ params }: PageProps) {
  const { agencySlug } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name, owner_id')
    .eq('slug', agencySlug)
    .single()

  if (!agency || agency.owner_id !== user.id) redirect('/app')

  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id, name, slug, logo_url, created_at')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader title="Brands" />
      <div className="p-5">
        {(workspaces ?? []).length === 0 ? (
          <div className="rounded-xl border border-border bg-background-surface p-12 text-center">
            <p className="text-sm text-foreground-muted">No brands yet. Invite your first brand from the dashboard.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(workspaces ?? []).map((ws) => (
              <a
                key={ws.id}
                href={`/${ws.slug}/overview`}
                className="block rounded-xl border border-border bg-background-surface p-4 transition-colors hover:border-brand hover:bg-brand-muted/30"
              >
                <p className="font-semibold text-sm text-foreground">{ws.name}</p>
                <p className="text-xs text-foreground-muted mt-0.5">View workspace →</p>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
