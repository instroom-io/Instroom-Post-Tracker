import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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
    .select('id, name, slug, logo_url, created_at, campaigns(count), posts(count)')
    .eq('agency_id', agency.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-5">
        {(workspaces ?? []).length === 0 ? (
          <div className="rounded-xl border border-border bg-background-surface p-12 text-center">
            <p className="text-sm text-foreground-muted">No brands yet. Invite your first brand from the dashboard.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(workspaces ?? []).map((ws) => {
              const campaignCount = (ws.campaigns as unknown as { count: number }[])[0]?.count ?? 0
              const postCount = (ws.posts as unknown as { count: number }[])[0]?.count ?? 0
              const campaignLabel = campaignCount === 1 ? '1 campaign' : `${campaignCount} campaigns`
              const postLabel = postCount === 1 ? '1 post' : `${postCount} posts`
              const dateAdded = new Date(ws.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              return (
                <a
                  key={ws.id}
                  href={`/${ws.slug}/overview`}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-background-surface p-4 shadow-sm transition-colors hover:border-brand hover:bg-brand-muted/30"
                >
                  <div className="flex items-center gap-3">
                    {ws.logo_url ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ws.logo_url} alt={ws.name} className="h-8 w-8 flex-shrink-0 rounded-md object-contain" />
                      </>
                    ) : (
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-border bg-background-subtle text-[11px] font-semibold uppercase text-foreground-muted">
                        {ws.name.slice(0, 2)}
                      </div>
                    )}
                    <p className="font-semibold text-[13px] text-foreground">{ws.name}</p>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-[11px] text-foreground-muted">{campaignLabel} · {postLabel}</p>
                    <p className="text-[11px] text-foreground-lighter">Added {dateAdded}</p>
                  </div>
                </a>
              )
            })}
          </div>
        )}
    </div>
  )
}
