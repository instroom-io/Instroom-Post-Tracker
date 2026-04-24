import { HardDrives, TrendUp } from '@phosphor-icons/react/dist/ssr'
import { createServiceClient } from '@/lib/supabase/server'

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

export async function AdminStatCards() {
  const supabase = createServiceClient()

  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  const [
    { data: soloPlans },
    { data: teamPlans },
    { data: expiringWs },
    { data: expiringAg },
    { count: postCount },
    { data: emvRows },
  ] = await Promise.all([
    supabase.from('workspaces').select('plan').is('agency_id', null),
    supabase.from('agencies').select('plan'),
    supabase
      .from('workspaces')
      .select('id')
      .is('agency_id', null)
      .eq('plan', 'trial')
      .lte('trial_ends_at', threeDaysFromNow.toISOString())
      .gt('trial_ends_at', now.toISOString()),
    supabase
      .from('agencies')
      .select('id')
      .eq('plan', 'trial')
      .lte('trial_ends_at', threeDaysFromNow.toISOString())
      .gt('trial_ends_at', now.toISOString()),
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('post_metrics').select('emv').not('emv', 'is', null),
  ])

  const soloTotal       = soloPlans?.length ?? 0
  const soloTrialCount  = soloPlans?.filter(p => p.plan === 'trial').length ?? 0
  const soloProCount    = soloPlans?.filter(p => p.plan === 'pro').length ?? 0
  const soloFreeCount   = soloPlans?.filter(p => p.plan === 'free').length ?? 0

  const teamTotal       = teamPlans?.length ?? 0
  const teamTrialCount  = teamPlans?.filter(p => p.plan === 'trial').length ?? 0
  const teamProCount    = teamPlans?.filter(p => p.plan === 'pro').length ?? 0
  const teamFreeCount   = teamPlans?.filter(p => p.plan === 'free').length ?? 0

  const expiringCount   = (expiringWs?.length ?? 0) + (expiringAg?.length ?? 0)

  const totalEmv = (emvRows ?? []).reduce((sum, r) => sum + (r.emv ?? 0), 0)
  const formattedEmv = totalEmv >= 1000
    ? `€${(totalEmv / 1000).toFixed(1)}K`
    : `€${totalEmv.toFixed(0)}`

  const delayClasses = [
    '',
    'animate-fade-up-delay-1',
    'animate-fade-up-delay-2',
    'animate-fade-up-delay-3',
    'animate-fade-up-delay-4',
  ]

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">

      {/* Card 1 — Solo Plan Accounts */}
      <div className={`animate-fade-up rounded-xl border border-border bg-background-surface p-4 shadow-md ${delayClasses[0]}`}>
        <p className="text-[12px] font-medium text-foreground-lighter">Solo Plan Accounts</p>
        <p className="mt-2 font-display text-[22px] font-extrabold text-accent">{soloTotal}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {soloTrialCount > 0 && <PlanPill type="trial" count={soloTrialCount} />}
          {soloProCount   > 0 && <PlanPill type="pro"   count={soloProCount} />}
          {soloFreeCount  > 0 && <PlanPill type="free"  count={soloFreeCount} />}
        </div>
      </div>

      {/* Card 2 — Team Plan Accounts */}
      <div className={`animate-fade-up rounded-xl border border-border bg-background-surface p-4 shadow-md ${delayClasses[1]}`}>
        <p className="text-[12px] font-medium text-foreground-lighter">Team Plan Accounts</p>
        <p className="mt-2 font-display text-[22px] font-extrabold text-info">{teamTotal}</p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {teamTrialCount > 0 && <PlanPill type="trial" count={teamTrialCount} />}
          {teamProCount   > 0 && <PlanPill type="pro"   count={teamProCount} />}
          {teamFreeCount  > 0 && <PlanPill type="free"  count={teamFreeCount} />}
        </div>
      </div>

      {/* Card 3 — Trials Expiring */}
      <div className={`animate-fade-up rounded-xl border border-border bg-background-surface p-4 shadow-md ${delayClasses[2]}`}>
        <p className="text-[12px] font-medium text-foreground-lighter">Trials Expiring ≤ 3 days</p>
        <p className={`mt-2 font-display text-[22px] font-extrabold ${expiringCount > 0 ? 'text-destructive' : 'text-foreground'}`}>
          {expiringCount}
        </p>
        <p className="mt-0.5 text-[11px] text-foreground-muted">
          {expiringCount > 0 ? 'requires attention' : 'no urgency'}
        </p>
      </div>

      {/* Card 4 — Posts Downloaded */}
      <div className={`animate-fade-up rounded-xl border border-border bg-background-surface p-4 shadow-md ${delayClasses[3]}`}>
        <div className="flex items-start justify-between">
          <p className="text-[12px] font-medium text-foreground-lighter">Posts Downloaded</p>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10">
            <HardDrives size={14} weight="duotone" className="text-info" />
          </div>
        </div>
        <p className="mt-2 font-display text-[22px] font-extrabold text-foreground">
          {(postCount ?? 0).toLocaleString()}
        </p>
        <p className="mt-0.5 text-[11px] text-foreground-muted">to Google Drive</p>
      </div>

      {/* Card 5 — Platform EMV */}
      <div className={`animate-fade-up rounded-xl border border-border bg-background-surface p-4 shadow-md ${delayClasses[4]}`}>
        <div className="flex items-start justify-between">
          <p className="text-[12px] font-medium text-foreground-lighter">Platform EMV</p>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning/10">
            <TrendUp size={14} weight="duotone" className="text-warning" />
          </div>
        </div>
        <p className="mt-2 font-display text-[22px] font-extrabold text-foreground">{formattedEmv}</p>
        <p className="mt-0.5 text-[11px] text-foreground-muted">estimated media value</p>
      </div>

    </div>
  )
}
