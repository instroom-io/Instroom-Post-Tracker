import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InviteBrandDialog } from '@/components/agency/invite-brand-dialog'
import { ChevronRight } from 'lucide-react'
import type { WorkspaceRole } from '@/lib/types'

const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  manager: 'Manager',
  viewer: 'Viewer',
}

interface PageProps {
  params: Promise<{ agencySlug: string }>
  searchParams: Promise<{ invite?: string }>
}

export default async function AgencyDashboardPage({ params, searchParams }: PageProps) {
  const { agencySlug } = await params
  const { invite } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agency } = await supabase
    .from('agencies')
    .select('id, name')
    .eq('slug', agencySlug)
    .single()

  if (!agency) redirect('/app')

  const [{ data: workspaces }, { data: sharedMemberships }] = await Promise.all([
    supabase
      .from('workspaces')
      .select('id, name, slug, logo_url, created_at, campaigns(count), posts(count)')
      .eq('agency_id', agency.id),
    supabase
      .from('workspace_members')
      .select('role, workspaces(id, name, slug, logo_url, campaigns(count), posts(count))')
      .eq('user_id', user.id)
      .neq('role', 'owner'),
  ])

  type SharedWs = {
    id: string; name: string; slug: string; logo_url: string | null
    campaigns: unknown; posts: unknown; role: WorkspaceRole
  }
  const sharedWorkspaces: SharedWs[] = (sharedMemberships ?? [])
    .filter((m) => m.workspaces != null)
    .map((m) => ({
      ...(m.workspaces as unknown as { id: string; name: string; slug: string; logo_url: string | null; campaigns: unknown; posts: unknown }),
      role: m.role as WorkspaceRole,
    }))

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-xl border border-border bg-background-surface p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-foreground">Workspaces</h2>
          <InviteBrandDialog agencyId={agency.id} defaultOpen={invite === '1'} />
        </div>
        {(workspaces ?? []).length === 0 ? (
          <p className="text-[13px] text-foreground-lighter">No workspaces yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {workspaces!.slice(0, 5).map((w) => {
              const campaignCount = (w.campaigns as unknown as { count: number }[])[0]?.count ?? 0
              const postCount = (w.posts as unknown as { count: number }[])[0]?.count ?? 0
              const campaignLabel = campaignCount === 1 ? '1 campaign' : `${campaignCount} campaigns`
              const postLabel = postCount === 1 ? '1 post' : `${postCount} posts`
              return (
                <a key={w.id} href={`/${w.slug}/overview`} className="flex items-center gap-3 rounded-lg border border-border px-4 py-2.5 hover:border-foreground/20 transition-colors">
                  {w.logo_url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={w.logo_url} alt={w.name} className="h-7 w-7 flex-shrink-0 rounded-md object-contain" />
                    </>
                  ) : (
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-border bg-background-subtle text-[11px] font-semibold uppercase text-foreground-muted">
                      {w.name.slice(0, 2)}
                    </div>
                  )}
                  <p className="flex-1 text-[13px] font-medium text-foreground">{w.name}</p>
                  <span className="flex-shrink-0 text-[11px] text-foreground-muted">{campaignLabel} · {postLabel}</span>
                  <ChevronRight size={14} className="flex-shrink-0 text-foreground-lighter" />
                </a>
              )
            })}
          </div>
        )}
      </div>

      {sharedWorkspaces.length > 0 && (
        <div className="rounded-xl border border-border bg-background-surface p-5 shadow-sm">
          <h2 className="mb-4 text-[14px] font-semibold text-foreground">Shared Workspaces</h2>
          <div className="flex flex-col gap-2">
            {sharedWorkspaces.map((w) => {
              const campaignCount = (w.campaigns as unknown as { count: number }[])[0]?.count ?? 0
              const postCount = (w.posts as unknown as { count: number }[])[0]?.count ?? 0
              const campaignLabel = campaignCount === 1 ? '1 campaign' : `${campaignCount} campaigns`
              const postLabel = postCount === 1 ? '1 post' : `${postCount} posts`
              return (
                <a key={w.id} href={`/${w.slug}/overview`} className="flex items-center gap-3 rounded-lg border border-border px-4 py-2.5 hover:border-foreground/20 transition-colors">
                  {w.logo_url ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={w.logo_url} alt={w.name} className="h-7 w-7 flex-shrink-0 rounded-md object-contain" />
                    </>
                  ) : (
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border border-border bg-background-subtle text-[11px] font-semibold uppercase text-foreground-muted">
                      {w.name.slice(0, 2)}
                    </div>
                  )}
                  <p className="flex-1 text-[13px] font-medium text-foreground">{w.name}</p>
                  <span className="flex-shrink-0 text-[11px] text-foreground-muted">{campaignLabel} · {postLabel}</span>
                  <span className="flex-shrink-0 rounded-md bg-background-muted px-2 py-0.5 text-[11px] font-medium text-foreground-muted">
                    {ROLE_LABELS[w.role]}
                  </span>
                  <ChevronRight size={14} className="flex-shrink-0 text-foreground-lighter" />
                </a>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
