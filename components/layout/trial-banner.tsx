// components/layout/trial-banner.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X } from '@phosphor-icons/react'
import type { PlanType } from '@/lib/utils/plan'
import { trialDaysRemaining, isTrialExpiring } from '@/lib/utils/plan'

interface TrialBannerProps {
  plan: PlanType
  trialEndsAt: string | null
}

export function TrialBanner({ plan, trialEndsAt }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || plan !== 'trial') return null

  const days = trialDaysRemaining(trialEndsAt)
  const expiring = isTrialExpiring(trialEndsAt)
  const expired = days === 0 && trialEndsAt !== null

  if (expired) {
    return (
      <div className="flex items-center justify-between gap-4 border-b border-destructive/20 bg-destructive/10 px-5 py-2.5">
        <p className="text-[12px] font-medium text-destructive">
          Your trial has ended.{' '}
          <Link href="/upgrade" className="underline hover:no-underline">
            Upgrade to restore full access
          </Link>
        </p>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 text-destructive/60 transition-colors hover:text-destructive"
        >
          <X size={14} />
        </button>
      </div>
    )
  }

  if (!trialEndsAt) return null

  const bannerCls = expiring
    ? 'border-b border-amber-500/20 bg-amber-50 dark:bg-amber-950/30'
    : 'border-b border-brand/10 bg-brand/5'
  const textCls = expiring ? 'text-amber-700 dark:text-amber-400' : 'text-foreground-light'

  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-2.5 ${bannerCls}`}>
      <p className={`text-[12px] font-medium ${textCls}`}>
        {expiring
          ? `Your trial ends in ${days} day${days !== 1 ? 's' : ''} — `
          : `Free trial · ${days} day${days !== 1 ? 's' : ''} remaining. `}
        <Link href="/upgrade" className="underline hover:no-underline">
          Upgrade to keep full access
        </Link>
      </p>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className={`shrink-0 transition-opacity ${textCls} opacity-50 hover:opacity-100`}
      >
        <X size={14} />
      </button>
    </div>
  )
}
