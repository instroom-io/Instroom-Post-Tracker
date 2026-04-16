'use client'

// components/layout/trial-banner.tsx
// Compact pill-style trial banner (Option D) — minimal footprint, non-disruptive.

import Link from 'next/link'
import { getTrialState } from '@/lib/billing/trial-state'
import type { PlanType } from '@/lib/utils/plan'
import type { WorkspaceRole } from '@/lib/types'

interface TrialBannerProps {
  plan: PlanType
  /** Pre-computed on the server via computeDaysRemaining() — never call Date.now() here. */
  daysRemaining: number
  /** Full href for the upgrade/compare-plans link (e.g. /${workspaceSlug}/upgrade or /agency/${slug}/settings) */
  upgradeHref: string
  role: WorkspaceRole
}

export function TrialBanner({ plan, daysRemaining, upgradeHref, role }: TrialBannerProps) {
  // Only show to workspace owners during trial
  if (role !== 'owner') return null

  const state = getTrialState(plan, daysRemaining)

  // Hide when subscribed or hard-expired (paywall takes over)
  if (state.isSubscribed || state.isExpired) return null

  // Hide if no trial info at all
  if (!state.isTrialing && !state.isGracePeriod && !state.isCritical) return null

  // Pill color — escalates from soft amber → deep amber → red
  let pillCls: string
  if (state.isCritical || state.isGracePeriod) {
    pillCls = 'bg-destructive-muted text-destructive border-destructive/30'
  } else if (state.isWarning) {
    pillCls = 'bg-amber-200 text-amber-900 border-amber-400'
  } else {
    pillCls = 'bg-amber-50 text-amber-700 border-amber-300'
  }

  // Pill label
  const abs = Math.abs(state.daysRemaining)
  const dayWord = abs !== 1 ? 'days' : 'day'
  let pillLabel: string
  if (state.isGracePeriod) {
    pillLabel = `Trial ended ${abs} ${dayWord} ago`
  } else if (state.daysRemaining === 0) {
    pillLabel = 'Trial expires today'
  } else {
    pillLabel = `Trial: ${state.daysRemaining} ${state.daysRemaining !== 1 ? 'days' : 'day'} left`
  }

  return (
    <div className="flex items-center justify-between gap-4 bg-background px-5 py-2 border-b border-border">
      <div className="flex items-center gap-3">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${pillCls}`}>
          {pillLabel}
        </span>
        <span className="hidden text-[12px] text-foreground-lighter sm:block">
          Instroom Post Tracker · Free plan
        </span>
      </div>
      <Link
        href={upgradeHref}
        className="shrink-0 text-[12px] font-medium text-brand transition-colors hover:text-brand/80"
      >
        Compare plans ↗
      </Link>
    </div>
  )
}
