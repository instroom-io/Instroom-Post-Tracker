import { Suspense } from 'react'
import { AdminStatCards } from '@/components/admin/admin-stat-cards'
import { AgenciesTable } from '@/components/admin/agencies-table'
import { WorkspacesTable } from '@/components/admin/workspaces-table'
import { createServiceClient } from '@/lib/supabase/server'
import { trialDaysRemaining } from '@/lib/utils/plan'
import type { PlanType } from '@/lib/utils/plan'

export default async function AdminPage() {
  const supabase = createServiceClient()

  const now = new Date()
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

  // Round 1 — parallel, no joins (avoids PostgREST nested embed issue with service client)
  const [{ data: agenciesRaw }, { data: workspacesRaw }, { data: brandWorkspacesRaw }] = await Promise.all([
    supabase
      .from('agencies')
      .select('id, name, slug, plan, trial_ends_at, owner_id, logo_url')
      .order('created_at', { ascending: false }),
    supabase
      .from('workspaces')
      .select('id, name, slug, plan, trial_ends_at, logo_url')
      .is('agency_id', null)
      .order('created_at', { ascending: false }),
    supabase
      .from('workspaces')
      .select('agency_id')
      .not('agency_id', 'is', null),
  ])

  // Round 2 — owner lookups in parallel
  const agencyOwnerIds = (agenciesRaw ?? [])
    .map(a => a.owner_id)
    .filter((id): id is string => !!id)
  const wsIds = (workspacesRaw ?? []).map(ws => ws.id)

  const [{ data: agencyOwners }, { data: wsOwnerMembers }] = await Promise.all([
    agencyOwnerIds.length > 0
      ? supabase.from('users').select('id, email').in('id', agencyOwnerIds)
      : Promise.resolve({ data: [] as { id: string; email: string }[] }),
    wsIds.length > 0
      ? supabase
          .from('workspace_members')
          .select('workspace_id, user_id')
          .eq('role', 'owner')
          .in('workspace_id', wsIds)
      : Promise.resolve({ data: [] as { workspace_id: string; user_id: string }[] }),
  ])

  // Round 3 — user emails for workspace owners
  const wsOwnerUserIds = [
    ...new Set((wsOwnerMembers ?? []).map(m => m.user_id).filter(Boolean))
  ] as string[]

  const { data: wsOwnerUsers } = wsOwnerUserIds.length > 0
    ? await supabase.from('users').select('id, email').in('id', wsOwnerUserIds)
    : { data: [] as { id: string; email: string }[] }

  // Build email maps
  const agencyOwnerEmailMap = Object.fromEntries(
    (agencyOwners ?? []).map(u => [u.id, u.email ?? null])
  )
  const wsUserEmailMap = Object.fromEntries(
    (wsOwnerUsers ?? []).map(u => [u.id, u.email ?? null])
  )
  const wsOwnerEmailMap = Object.fromEntries(
    (wsOwnerMembers ?? []).map(m => [m.workspace_id, wsUserEmailMap[m.user_id] ?? null])
  )

  const brandCountByAgency = (brandWorkspacesRaw ?? []).reduce<Record<string, number>>(
    (acc, ws) => {
      if (ws.agency_id) acc[ws.agency_id] = (acc[ws.agency_id] ?? 0) + 1
      return acc
    },
    {}
  )

  const agencies = (agenciesRaw ?? []).map(a => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    logo_url: a.logo_url,
    plan: (a.plan ?? 'free') as PlanType,
    trial_ends_at: a.trial_ends_at,
    owner_email: agencyOwnerEmailMap[a.owner_id] ?? null,
    brand_count: brandCountByAgency[a.id] ?? 0,
  }))

  const workspaces = (workspacesRaw ?? []).map(ws => ({
    id: ws.id,
    name: ws.name,
    slug: ws.slug,
    logo_url: ws.logo_url,
    plan: (ws.plan ?? 'free') as PlanType,
    trial_ends_at: ws.trial_ends_at,
    owner_email: wsOwnerEmailMap[ws.id] ?? null,
  }))

  const expiringAgencies = agencies.filter(
    a => a.plan === 'trial' && a.trial_ends_at &&
      new Date(a.trial_ends_at).getTime() - now.getTime() <= THREE_DAYS_MS &&
      new Date(a.trial_ends_at).getTime() > now.getTime()
  )
  const expiringWorkspaces = workspaces.filter(
    ws => ws.plan === 'trial' && ws.trial_ends_at &&
      new Date(ws.trial_ends_at).getTime() - now.getTime() <= THREE_DAYS_MS &&
      new Date(ws.trial_ends_at).getTime() > now.getTime()
  )

  const expiringCount = expiringAgencies.length + expiringWorkspaces.length
  const firstExpiring = expiringAgencies[0]
    ? { ...expiringAgencies[0], type: 'Team' as const }
    : expiringWorkspaces[0]
    ? { ...expiringWorkspaces[0], type: 'Solo' as const }
    : null

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Platform Overview</h1>
        <p className="text-[13px] text-foreground-lighter">
          Instroom Admin · {now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      <Suspense fallback={<div className="h-24 skeleton rounded-xl" />}>
        <AdminStatCards />
      </Suspense>

      {expiringCount > 0 && firstExpiring && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3">
          <span className="mt-0.5 text-base">⚠️</span>
          <div>
            <p className="text-[13px] font-semibold text-foreground">
              {expiringCount} trial{expiringCount > 1 ? 's' : ''} expiring within 3 days
            </p>
            <p className="mt-0.5 text-[12px] text-foreground-light">
              {firstExpiring.name} · {firstExpiring.type} Plan ·{' '}
              {trialDaysRemaining(firstExpiring.trial_ends_at)} day{trialDaysRemaining(firstExpiring.trial_ends_at) !== 1 ? 's' : ''} left
              {' '}— trial worker will downgrade to free on expiry
            </p>
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-foreground">Solo Plan Accounts</h2>
          <span className="rounded-full bg-background-muted px-2.5 py-0.5 text-[11px] text-foreground-lighter">
            {workspaces.length} account{workspaces.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="rounded-xl border border-border bg-background-surface px-5 py-4">
          <WorkspacesTable workspaces={workspaces} />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-foreground">Team Plan Accounts</h2>
          <span className="rounded-full bg-background-muted px-2.5 py-0.5 text-[11px] text-foreground-lighter">
            {agencies.length} account{agencies.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="rounded-xl border border-border bg-background-surface px-5 py-4">
          <AgenciesTable agencies={agencies} />
        </div>
      </div>
    </div>
  )
}
