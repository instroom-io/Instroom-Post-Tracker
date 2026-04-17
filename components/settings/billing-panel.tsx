// components/settings/billing-panel.tsx
// Billing section shown in Settings for workspace owners only.

import { BillingStatusCard } from '@/components/billing/billing-status-card'
import type { PlanType } from '@/lib/utils/plan'

interface BillingPanelProps {
  plan: PlanType
  /** Pre-computed on the server via computeDaysRemaining() — no Date.now() in client render. */
  daysRemaining: number
  accountType: 'solo' | 'team'
  workspaceSlug: string
  memberCounts: {
    owner: number
    admin: number
    editor: number
    manager: number
    viewer: number
  }
  extraWorkspaces?: number
}

export function BillingPanel({
  plan,
  daysRemaining,
  accountType,
  workspaceSlug,
  memberCounts,
  extraWorkspaces,
}: BillingPanelProps) {
  return (
    <div data-testid="billing-panel" className="rounded-xl border border-border bg-background-surface shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-display text-[15px] font-bold text-foreground">Billing</h2>
        <p className="mt-0.5 text-[12px] text-foreground-lighter">
          Manage your subscription and plan.
        </p>
      </div>
      <div className="p-5">
        <BillingStatusCard
          plan={plan}
          daysRemaining={daysRemaining}
          accountType={accountType}
          workspaceSlug={workspaceSlug}
          memberCounts={memberCounts}
          extraWorkspaces={extraWorkspaces}
        />
      </div>
    </div>
  )
}
