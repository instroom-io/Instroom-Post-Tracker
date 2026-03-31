import Link from 'next/link'
import { Users, Layers } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ agencyId: string }>
}

export default async function AgencyDetailPage({ params }: PageProps) {
  const { agencyId } = await params
  const supabase = createServiceClient()

  const [{ data: agency }, { data: workspaces }] = await Promise.all([
    supabase.from('agencies').select('*').eq('id', agencyId).single(),
    supabase.from('workspaces').select('id, name, slug, created_at').eq('agency_id', agencyId),
  ])

  if (!agency) redirect('/admin/agencies')

  const workspaceIds = workspaces?.map((w) => w.id) ?? []

  const [{ data: ownerUser }, { data: postRows }] = await Promise.all([
    supabase.from('users').select('full_name, email').eq('id', agency.owner_id).single(),
    workspaceIds.length > 0
      ? supabase.from('posts').select('workspace_id').in('workspace_id', workspaceIds)
      : Promise.resolve({ data: [] }),
  ])

  const totalPostCount = postRows?.length ?? 0

  const postsByWorkspace: Record<string, number> = {}
  for (const row of postRows ?? []) {
    postsByWorkspace[row.workspace_id] = (postsByWorkspace[row.workspace_id] ?? 0) + 1
  }

  const joinedDate = new Date(agency.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  const inlineStats = [
    {
      label: 'Brand Clients',
      value: workspaces?.length ?? 0,
      icon: Users,
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent',
      sub: 'workspaces',
    },
    {
      label: 'Total Posts',
      value: totalPostCount,
      icon: Layers,
      iconBg: 'bg-brand/10',
      iconColor: 'text-brand',
      sub: 'downloaded',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/agencies" className="text-[12px] text-foreground-lighter hover:text-foreground">← All agencies</Link>
        <h1 className="mt-1 text-xl font-bold text-foreground">{agency.name}</h1>
        <p className="text-[13px] text-foreground-lighter">
          {agency.slug} · {agency.status} · joined {joinedDate}
        </p>
        {ownerUser && (
          <p className="mt-0.5 text-[12px] text-foreground-muted">
            {ownerUser.full_name ? `${ownerUser.full_name} · ` : ''}{ownerUser.email}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {inlineStats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-background-surface p-4">
            <div className="flex items-start justify-between">
              <p className="text-[12px] font-medium text-foreground-lighter">{stat.label}</p>
              <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', stat.iconBg)}>
                <stat.icon size={14} className={stat.iconColor} />
              </div>
            </div>
            <p className="mt-2 font-display text-[22px] font-extrabold text-foreground">{stat.value}</p>
            <p className="mt-0.5 text-[11px] text-foreground-muted">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-background-surface p-5">
        <h2 className="mb-4 text-[13px] font-semibold text-foreground">Brand Workspaces</h2>
        {(workspaces ?? []).length === 0 ? (
          <p className="text-[13px] text-foreground-lighter">No brand workspaces yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {workspaces!.map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium text-foreground">{w.name}</p>
                  <p className="text-[11px] text-foreground-muted">
                    {w.slug} · {new Date(w.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className="text-[11px] text-foreground-lighter">
                  {postsByWorkspace[w.id] ?? 0} posts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
