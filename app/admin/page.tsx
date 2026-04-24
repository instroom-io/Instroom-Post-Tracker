import { Suspense } from 'react'
import { AdminStatCards } from '@/components/admin/admin-stat-cards'
import { createServiceClient } from '@/lib/supabase/server'
import { trialDaysRemaining } from '@/lib/utils/plan'

export default async function AdminPage() {
  const supabase = createServiceClient()

  const now = new Date()
  const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
  const threeDaysFromNow = new Date(now.getTime() + THREE_DAYS_MS).toISOString()

  // Fetch only what's needed for the alert banner — stat cards handle their own queries
  const [{ data: expiringAgencies }, { data: expiringWorkspaces }] = await Promise.all([
    supabase
      .from('agencies')
      .select('id, name, trial_ends_at')
      .eq('plan', 'trial')
      .lte('trial_ends_at', threeDaysFromNow)
      .gt('trial_ends_at', now.toISOString()),
    supabase
      .from('workspaces')
      .select('id, name, trial_ends_at')
      .is('agency_id', null)
      .eq('plan', 'trial')
      .lte('trial_ends_at', threeDaysFromNow)
      .gt('trial_ends_at', now.toISOString()),
  ])

  const expiringCount = (expiringAgencies?.length ?? 0) + (expiringWorkspaces?.length ?? 0)
  const firstExpiring = expiringAgencies?.[0]
    ? { ...expiringAgencies[0], type: 'Team' as const }
    : expiringWorkspaces?.[0]
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
    </div>
  )
}
