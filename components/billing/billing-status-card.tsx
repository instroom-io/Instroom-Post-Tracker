'use client'

// components/billing/billing-status-card.tsx
// Displays current billing status: trialing / active / expired.
// Used inside the Settings Billing tab (BillingPanel).

import Link from 'next/link'
import { getTrialState } from '@/lib/billing/trial-state'
import { PRICING, calcTeamTotal } from '@/lib/billing/pricing'
import { Badge } from '@/components/ui/badge'
import type { PlanType } from '@/lib/utils/plan'

interface BillingStatusCardProps {
  plan: PlanType
  /** Pre-computed on the server via computeDaysRemaining() — no Date.now() in client render. */
  daysRemaining: number
  accountType: 'solo' | 'team'
  workspaceSlug: string
  memberCounts: { owner: number; admin: number; editor: number; manager: number; viewer: number }
  extraWorkspaces?: number
}

export function BillingStatusCard({
  plan,
  daysRemaining,
  accountType,
  workspaceSlug,
  memberCounts,
  extraWorkspaces = 0,
}: BillingStatusCardProps) {
  const state = getTrialState(plan, daysRemaining)

  const totalMembers =
    memberCounts.owner +
    memberCounts.admin +
    memberCounts.editor +
    memberCounts.manager +
    memberCounts.viewer

  const includedWorkspaces = accountType === 'solo' ? 1 : PRICING.team.includedWorkspaces
  const monthlyTotal =
    accountType === 'solo'
      ? PRICING.solo.workspacePrice
      : calcTeamTotal(extraWorkspaces)
  const workspaceLine = `${includedWorkspaces} workspace${includedWorkspaces !== 1 ? 's' : ''} · $${monthlyTotal}/month`

  // Progress bar: trial consumption (0 = full, 1 = empty)
  const TRIAL_DAYS = 14
  const consumed = Math.min(1, Math.max(0, 1 - state.daysRemaining / TRIAL_DAYS))
  const barColor = state.isCritical
    ? 'bg-destructive'
    : state.isWarning
    ? 'bg-amber-500'
    : 'bg-brand'

  return (
    <div className="flex flex-col gap-4">
      {/* Status header */}
      <div className="flex items-center gap-3">
        {state.isSubscribed ? (
          <Badge variant="success">Active</Badge>
        ) : state.isExpired || state.isGracePeriod ? (
          <Badge variant="destructive">Expired</Badge>
        ) : (
          <Badge variant="warning">Trial</Badge>
        )}
        <span className="text-[12px] text-foreground-lighter">
          {state.isSubscribed
            ? `${accountType === 'solo' ? 'Solo' : 'Team'} · ${workspaceLine}`
            : state.isExpired
            ? 'Your trial has ended'
            : state.isGracePeriod
            ? `Trial ended ${Math.abs(state.daysRemaining)} day${Math.abs(state.daysRemaining) !== 1 ? 's' : ''} ago`
            : `${state.daysRemaining} day${state.daysRemaining !== 1 ? 's' : ''} remaining`}
        </span>
      </div>

      {/* Trial progress bar */}
      {!state.isSubscribed && !state.isExpired && (
        <div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-background-muted">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${consumed * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-foreground-muted">
            {TRIAL_DAYS}-day free trial · {state.daysRemaining > 0 ? state.daysRemaining : 0} days remaining
          </p>
        </div>
      )}

      {/* Active subscription details */}
      {state.isSubscribed && (
        <div className="rounded-lg border border-border bg-background-muted px-4 py-3 text-[12px] text-foreground-light">
          <p>Account: <span className="font-medium text-foreground">{accountType === 'solo' ? 'Solo' : 'Team'}</span></p>
          <p className="mt-0.5">
            Workspaces: <span className="font-medium text-foreground">{includedWorkspaces} included</span>
          </p>
          {extraWorkspaces > 0 && (
            <p className="mt-0.5">
              Extra: <span className="font-medium text-foreground">+{extraWorkspaces} workspace{extraWorkspaces !== 1 ? 's' : ''} · +${extraWorkspaces * PRICING.team.extraWorkspacePrice}/month</span>
            </p>
          )}
          <p className="mt-0.5">
            Amount: <span className="font-medium text-foreground">${monthlyTotal}/month</span>
          </p>
          <a
            href="https://www.paypal.com/myaccount/autopay/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-background-muted"
          >
            Manage or cancel on PayPal ↗
          </a>
        </div>
      )}

      {/* Member summary */}
      <div className="rounded-lg border border-border bg-background-surface px-4 py-3">
        <p className="text-[12px] font-medium text-foreground">Members in this workspace</p>
        <p className="mt-1 text-[12px] text-foreground-lighter">
          {totalMembers} {totalMembers === 1 ? 'member' : 'members'} total
          {' · '}All roles included free
        </p>
        <p className="mt-0.5 text-[11px] text-foreground-muted">
          Billed per workspace, not per seat.
        </p>
      </div>

      {/* CTA */}
      {!state.isSubscribed && (
        <Link
          href={`/${workspaceSlug}/upgrade`}
          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-4 text-[13px] font-semibold text-white shadow-xs transition-colors hover:bg-brand/90 active:bg-brand/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
        >
          {state.isExpired || state.isGracePeriod ? 'Reactivate' : 'Upgrade Now'}
        </Link>
      )}
    </div>
  )
}
