'use client'

// components/layout/trial-banner.tsx
// Persistent trial banner shown above the sidebar+content area for workspace owners.
// Non-dismissable. 3 visual states based on days remaining.

import Link from 'next/link'
import { Clock } from '@phosphor-icons/react'
import { getTrialState } from '@/lib/billing/trial-state'
import type { PlanType } from '@/lib/utils/plan'
import type { WorkspaceRole } from '@/lib/types'

interface TrialBannerProps {
  plan: PlanType
  /** Pre-computed on the server via computeDaysRemaining() — never call Date.now() here. */
  daysRemaining: number
  workspaceSlug: string
  role: WorkspaceRole
}

export function TrialBanner({ plan, daysRemaining, workspaceSlug, role }: TrialBannerProps) {
  // Only show to workspace owners during trial
  if (role !== 'owner') return null

  const state = getTrialState(plan, daysRemaining)

  // Hide when subscribed or hard-expired (paywall takes over)
  if (state.isSubscribed || state.isExpired) return null

  // Hide if no trial info at all
  if (!state.isTrialing && !state.isGracePeriod && !state.isCritical) return null

  let bannerCls: string
  let textCls: string
  let message: string

  if (state.isCritical || state.isGracePeriod) {
    bannerCls = 'bg-destructive/10 border-b border-destructive/30'
    textCls = 'text-destructive'
    message =
      state.daysRemaining === 0
        ? 'Your trial expires today — upgrade now'
        : state.isGracePeriod
        ? `Your trial ended ${Math.abs(state.daysRemaining)} day${Math.abs(state.daysRemaining) !== 1 ? 's' : ''} ago — upgrade now`
        : `Your trial expires in ${state.daysRemaining} day${state.daysRemaining !== 1 ? 's' : ''} — upgrade to avoid losing access`
  } else if (state.isWarning) {
    bannerCls = 'bg-amber-500/10 border-b border-amber-500/30'
    textCls = 'text-amber-600 dark:text-amber-400'
    message = `Only ${state.daysRemaining} days left — upgrade now to keep access`
  } else {
    bannerCls = 'bg-background-surface border-b border-border'
    textCls = 'text-foreground-light'
    message = `${state.daysRemaining} day${state.daysRemaining !== 1 ? 's' : ''} left in your free trial`
  }

  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-2 ${bannerCls}`}>
      <div className={`flex items-center gap-2 text-[12px] font-medium ${textCls}`}>
        <Clock size={14} weight="bold" className="shrink-0" />
        <span>{message}</span>
      </div>
      <Link
        href={`/${workspaceSlug}/upgrade`}
        className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 text-[12px] font-semibold text-white shadow-xs transition-colors hover:bg-brand/90 active:bg-brand/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      >
        Upgrade Now
      </Link>
    </div>
  )
}
