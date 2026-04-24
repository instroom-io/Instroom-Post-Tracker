import { TeamPlanDetailTable } from '@/components/admin/team-plan-detail-table'
import { createServiceClient } from '@/lib/supabase/server'
import { trialDaysRemaining } from '@/lib/utils/plan'
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

export default async function AdminAgenciesPage() {
  const supabase = createServiceClient()

  const now = new Date()
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

  // Round 1 — parallel
  const [{ data: agenciesRaw }, { data: brandWorkspacesRaw }] = await Promise.all([
    supabase
      .from('agencies')
      .select('id, name, slug, plan, trial_ends_at, owner_id, logo_url')
      .order('created_at', { ascending: false }),
    supabase
      .from('workspaces')
      .select('id, name, slug, agency_id')
      .not('agency_id', 'is', null),
  ])

  // Round 2 — agency owner emails
  const ownerIds = (agenciesRaw ?? [])
    .map(a => a.owner_id)
    .filter((id): id is string => !!id)

  const { data: agencyOwners } = ownerIds.length > 0
    ? await supabase.from('users').select('id, email').in('id', ownerIds)
    : { data: [] as { id: string; email: string }[] }

  const ownerEmailMap = Object.fromEntries(
    (agencyOwners ?? []).map(u => [u.id, u.email ?? null])
  )

  const brandWorkspaces = brandWorkspacesRaw ?? []

  const agencies = (agenciesRaw ?? []).map(a => ({
    id: a.id,
    name: a.name,
    slug: a.slug,
    logo_url: a.logo_url,
    plan: (a.plan ?? 'free') as PlanType,
    trial_ends_at: a.trial_ends_at,
    owner_email: ownerEmailMap[a.owner_id] ?? null,
    brands: brandWorkspaces
      .filter(ws => ws.agency_id === a.id)
      .map(ws => ({ id: ws.id, name: ws.name, slug: ws.slug })),
  }))

  const expiringCount = agencies.filter(
    a => a.plan === 'trial' && a.trial_ends_at &&
      new Date(a.trial_ends_at).getTime() - now.getTime() <= THREE_DAYS_MS &&
      new Date(a.trial_ends_at).getTime() > now.getTime()
  ).length

  const trialCount = agencies.filter(a => a.plan === 'trial').length
  const proCount   = agencies.filter(a => a.plan === 'pro').length
  const freeCount  = agencies.filter(a => a.plan === 'free').length

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">Team Plans</h1>
        <p className="text-[13px] text-foreground-lighter">All Team Plan accounts and their brand workspaces</p>
      </div>

      {/* 3 stat cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-background-surface p-4 shadow-md">
          <p className="text-[12px] font-medium text-foreground-lighter">Team Plan Accounts</p>
          <p className="mt-2 font-display text-[22px] font-extrabold text-info">{agencies.length}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {trialCount > 0 && <PlanPill type="trial" count={trialCount} />}
            {proCount   > 0 && <PlanPill type="pro"   count={proCount} />}
            {freeCount  > 0 && <PlanPill type="free"  count={freeCount} />}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-background-surface p-4 shadow-md">
          <p className="text-[12px] font-medium text-foreground-lighter">Brand Workspaces</p>
          <p className="mt-2 font-display text-[22px] font-extrabold text-foreground">{brandWorkspaces.length}</p>
          <p className="mt-0.5 text-[11px] text-foreground-muted">managed under team accounts</p>
        </div>
        <div className="rounded-xl border border-border bg-background-surface p-4 shadow-md">
          <p className="text-[12px] font-medium text-foreground-lighter">Expiring ≤ 3 days</p>
          <p className={`mt-2 font-display text-[22px] font-extrabold ${expiringCount > 0 ? 'text-destructive' : 'text-foreground'}`}>
            {expiringCount}
          </p>
          <p className="mt-0.5 text-[11px] text-foreground-muted">
            {expiringCount > 0 ? 'team account' : 'no urgency'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background-surface px-5 py-4">
        <TeamPlanDetailTable agencies={agencies} />
      </div>
    </div>
  )
}
