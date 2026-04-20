'use client'

import Link from 'next/link'
import { getTrialState } from '@/lib/billing/trial-state'
import type { PlanType } from '@/lib/utils/plan'
import type { WorkspaceRole } from '@/lib/types'

interface TrialBannerProps {
  plan: PlanType
  /** Pre-computed on the server via computeDaysRemaining() — never call Date.now() here. */
  daysRemaining: number
  /** Full href for the upgrade link — passed as /account/upgrade from AppShell. */
  upgradeHref: string
  role: WorkspaceRole
}

export function TrialBanner({ plan, daysRemaining, upgradeHref, role }: TrialBannerProps) {
  // Only owners see the trial banner
  if (role !== 'owner') return null

  const state = getTrialState(plan, daysRemaining)

  // Hide when already subscribed or hard-expired (paywall redirect handles that)
  if (state.isSubscribed || state.isExpired) return null

  // Hide if there is no active trial state to show
  if (!state.isTrialing && !state.isGracePeriod && !state.isCritical) return null

  // Option C: days 0–3 (isCritical) and grace period days -1 to -3 (isGracePeriod && < 0)
  const isUrgent = state.isCritical || state.isGracePeriod

  // ── Badge label ──────────────────────────────────────────────────────────
  let badgeLabel: string
  if (state.isGracePeriod && state.daysRemaining < 0) {
    badgeLabel = '⚠ TRIAL ENDED'
  } else if (state.isCritical) {
    badgeLabel = '⚠ EXPIRING SOON'
  } else {
    badgeLabel = 'FREE TRIAL'
  }

  // ── Body copy ─────────────────────────────────────────────────────────────
  const abs = Math.abs(state.daysRemaining)
  const absWord = abs === 1 ? 'day' : 'days'
  const dWord = state.daysRemaining === 1 ? 'day' : 'days'

  let body: React.ReactNode
  if (state.isGracePeriod && state.daysRemaining < 0) {
    body = (
      <>Your trial ended <strong>{abs} {absWord} ago</strong>. Upgrade to keep your data and campaigns.</>
    )
  } else if (state.isCritical && state.daysRemaining === 0) {
    body = <>Your free trial <strong>ends today</strong>. Upgrade to keep your data and campaigns.</>
  } else if (state.isCritical) {
    body = (
      <>Your free trial ends in <strong>{state.daysRemaining} {dWord}</strong>. Upgrade to keep your data and campaigns.</>
    )
  } else {
    // isTrialing (days 4+) — Option B reassurance copy
    body = (
      <>You have <strong>{state.daysRemaining} {dWord}</strong> left — no credit card needed to continue exploring.</>
    )
  }

  const btnLabel = isUrgent ? 'Upgrade Now →' : 'Upgrade →'

  // ── Option C — red urgency (days 0–3 and grace period) ───────────────────
  if (isUrgent) {
    return (
      <div
        data-testid="trial-banner"
        className="flex items-center justify-between gap-4 border-b border-destructive/20 bg-destructive-muted px-5 py-2.5"
      >
        <div className="flex items-center gap-3">
          <span className="inline-flex shrink-0 items-center rounded-full bg-destructive px-2.5 py-0.5 text-[11px] font-semibold text-white">
            {badgeLabel}
          </span>
          <span className="hidden text-[13px] text-foreground-light sm:block">
            {body}
          </span>
        </div>
        <Link
          href={upgradeHref}
          data-testid="trial-banner-upgrade-link"
          className="shrink-0 rounded-md bg-destructive px-3.5 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50"
        >
          {btnLabel}
        </Link>
      </div>
    )
  }

  // ── Option B — brand green (days 4–14) ────────────────────────────────────
  return (
    <div
      data-testid="trial-banner"
      className="flex items-center justify-between gap-4 border-b border-brand/20 bg-brand-muted px-5 py-2.5"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex shrink-0 items-center rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold text-white">
          {badgeLabel}
        </span>
        <span className="hidden text-[13px] text-foreground-light sm:block">
          {body}
        </span>
      </div>
      <Link
        href={upgradeHref}
        data-testid="trial-banner-upgrade-link"
        className="shrink-0 rounded-md bg-brand px-3.5 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
      >
        {btnLabel}
      </Link>
    </div>
  )
}
