// components/ui/upgrade-gate.tsx
'use client'

import Link from 'next/link'
import { Lock } from '@phosphor-icons/react'
import type { PlanFeature, PlanType } from '@/lib/utils/plan'
import { canUseFeature } from '@/lib/utils/plan'

interface UpgradeGateProps {
  plan: PlanType
  feature: PlanFeature
  children: React.ReactNode
  workspaceSlug: string
  /** Optional: minimum height for the locked placeholder. Default: none. */
  minHeight?: string
}

export function UpgradeGate({ plan, feature, children, workspaceSlug, minHeight }: UpgradeGateProps) {
  if (canUseFeature(plan, feature)) return <>{children}</>

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-background-surface p-8 text-center"
      style={minHeight ? { minHeight } : undefined}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background-muted">
        <Lock size={16} className="text-foreground-muted" weight="fill" />
      </div>
      <div>
        <p className="text-[13px] font-medium text-foreground">Upgrade to unlock</p>
        <p className="mt-0.5 text-[12px] text-foreground-lighter">
          This feature is available on Pro plans.
        </p>
      </div>
      <Link
        href={`/${workspaceSlug}/upgrade`}
        className="mt-1 inline-flex h-8 items-center rounded-lg bg-brand px-4 text-[12px] font-semibold text-white hover:bg-brand/90 transition-colors"
      >
        View upgrade options
      </Link>
    </div>
  )
}
