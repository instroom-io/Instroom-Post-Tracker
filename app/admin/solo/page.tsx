import { WorkspacesTable } from '@/components/admin/workspaces-table'
import { createServiceClient } from '@/lib/supabase/server'
import type { PlanType } from '@/lib/utils/plan'

function PlanPill({ type, count }: { type: 'trial' | 'pro' | 'free'; count: number }) {
  const classes = {
    trial: 'bg-warning-muted text-warning',
    pro:   'bg-brand-muted text-brand',
    free:  'bg-background-muted text-foreground-muted',
  }[type]
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${classes}`}>
      {count} {type}
    </span>
  )
}

export default async function AdminSoloPage() {
  const supabase = createServiceClient()

  const now = new Date()
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

  // Round 1 — solo workspaces (no joins)
  const { data: workspacesRaw } = await supabase
    .from('workspaces')
    .select('id, name, slug, plan, trial_ends_at, logo_url')
    .is('agency_id', null)
    .order('created_at', { ascending: false })

  // Round 2 — workspace owner member lookup
  const wsIds = (workspacesRaw ?? []).map(ws => ws.id)

  const { data: wsOwnerMembers } = wsIds.length > 0
    ? await supabase
        .from('workspace_members')
        .select('workspace_id, user_id')
        .eq('role', 'owner')
        .in('workspace_id', wsIds)
    : { data: [] as { workspace_id: string; user_id: string }[] }

  // Round 3 — user emails for workspace owners
  const wsOwnerUserIds = [
    ...new Set((wsOwnerMembers ?? []).map(m => m.user_id).filter(Boolean))
  ] as string[]

  const { data: wsOwnerUsers } = wsOwnerUserIds.length > 0
    ? await supabase.from('users').select('id, email').in('id', wsOwnerUserIds)
    : { data: [] as { id: string; email: string }[] }

  const wsUserEmailMap = Object.fromEntries(
    (wsOwnerUsers ?? []).map(u => [u.id, u.email ?? null])
  )
  const wsOwnerEmailMap = Object.fromEntries(
    (wsOwnerMembers ?? []).map(m => [m.workspace_id, wsUserEmailMap[m.user_id] ?? null])
  )

  const workspaces = (workspacesRaw ?? []).map(ws => ({
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    logo_url: ws.logo_url,
    plan: (ws.plan ?? 'free') as PlanType,
    trial_ends_at: ws.trial_ends_at,
    owner_email: wsOwnerEmailMap[ws.id] ?? null,
  }))

  const trialCount    = workspaces.filter(ws => ws.plan === 'trial').length
  const proCount      = workspaces.filter(ws => ws.plan === 'pro').length
  const freeCount     = workspaces.filter(ws => ws.plan === 'free').length
  const expiringCount = workspaces.filter(
    ws => ws.plan === 'trial' && ws.trial_ends_at &&
      new Date(ws.trial_ends_at).getTime() - now.getTime() <= THREE_DAYS_MS &&
      new Date(ws.trial_ends_at).getTime() > now.getTime()
  ).length

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Solo Plans</h1>
        <p className="text-[13px] text-foreground-lighter">All Solo Plan accounts on the platform</p>
      </div>

      {/* 3 stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-background-surface p-4 shadow-md">
          <p className="text-[12px] font-medium text-foreground-lighter">Solo Plan Accounts</p>
          <p className="mt-2 font-display text-[22px] font-extrabold text-accent">{workspaces.length}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {trialCount > 0 && <PlanPill type="trial" count={trialCount} />}
            {proCount   > 0 && <PlanPill type="pro"   count={proCount} />}
            {freeCount  > 0 && <PlanPill type="free"  count={freeCount} />}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background-surface p-4 shadow-md">
          <p className="text-[12px] font-medium text-foreground-lighter">Active Subscribers</p>
          <p className="mt-2 font-display text-[22px] font-extrabold text-brand">{proCount}</p>
          <p className="mt-0.5 text-[11px] text-foreground-muted">on Solo Pro plan</p>
        </div>
        <div className="rounded-xl border border-border bg-background-surface p-4 shadow-md">
          <p className="text-[12px] font-medium text-foreground-lighter">Expiring ≤ 3 days</p>
          <p className={`mt-2 font-display text-[22px] font-extrabold ${expiringCount > 0 ? 'text-destructive' : 'text-foreground'}`}>
            {expiringCount}
          </p>
          <p className="mt-0.5 text-[11px] text-foreground-muted">
            {expiringCount > 0 ? 'solo account' : 'no urgency'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background-surface px-5 py-4">
        <WorkspacesTable workspaces={workspaces} />
      </div>
    </div>
  )
}
