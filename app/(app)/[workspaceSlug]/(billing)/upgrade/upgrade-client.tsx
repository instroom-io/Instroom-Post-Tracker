'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle, Check } from '@phosphor-icons/react'
import { SubscriptionCheckout } from '@/components/billing/subscription-checkout'
import { PRICING, calcTeamTotal } from '@/lib/billing/pricing'
import type { PlanType } from '@/lib/utils/plan'

interface UpgradeClientProps {
  workspaceSlug: string
  plan: PlanType
  accountType: 'solo' | 'team'
  success: boolean
  cancelled: boolean
  successType: 'solo' | 'team'
  successTotal?: number
}

const SOLO_FEATURES = [
  '1 workspace',
  'Unlimited users — Admin, Manager, Viewer all free',
  'Post tracking, Drive sync, analytics, usage rights',
  '14-day free trial, no credit card required',
]

const TEAM_FEATURES = [
  '3 workspaces included',
  '+ $25/month per additional workspace',
  'Unlimited users across all workspaces',
  'All Solo features included',
  '14-day free trial, no credit card required',
]

export function UpgradeClient({
  workspaceSlug,
  accountType,
  success,
  cancelled,
  successType,
  successTotal,
}: UpgradeClientProps) {
  const [selected, setSelected] = useState<'solo' | 'team'>(accountType)
  const [extra, setExtra] = useState(0)

  if (success) {
    const total = successTotal ?? (successType === 'solo' ? PRICING.solo.workspacePrice : PRICING.team.basePrice)
    const workspaceCount = successType === 'solo' ? 1 : PRICING.team.includedWorkspaces

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 20 }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10"
        >
          <CheckCircle size={36} className="text-brand" weight="fill" />
        </motion.div>

        <div>
          <h1 className="text-[22px] font-bold text-foreground">You&apos;re all set!</h1>
          <p className="mt-1 text-[14px] text-foreground-lighter">
            Your {successType === 'solo' ? 'Solo' : 'Team'} subscription is now active.
          </p>
        </div>

        <div className="w-full rounded-xl border border-border bg-background-surface px-5 py-4 text-left text-[13px]">
          <p className="text-foreground-lighter">Account summary</p>
          <p className="mt-2 font-semibold text-foreground">
            {successType === 'solo' ? 'Solo' : 'Team'} · {workspaceCount} workspace{workspaceCount !== 1 ? 's' : ''} · ${total}/month
          </p>
        </div>

        <div className="flex w-full flex-col gap-2.5">
          <Link
            href={`/${workspaceSlug}/overview`}
            className="flex h-10 w-full items-center justify-center rounded-lg bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand/90"
          >
            Go to your workspace
          </Link>
          <Link
            href={`/${workspaceSlug}/settings?tab=billing`}
            className="flex h-10 w-full items-center justify-center rounded-lg border border-border bg-background px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-background-muted"
          >
            View billing settings
          </Link>
        </div>
      </motion.div>
    )
  }

  const teamTotal = calcTeamTotal(extra)

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-[22px] font-bold text-foreground">Choose your plan</h1>
        <p className="mt-1.5 text-[13px] text-foreground-lighter">
          14-day free trial included. No credit card required to start.
        </p>
      </div>

      {cancelled && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-700 dark:text-amber-400">
          Payment was cancelled. You can try again below.
        </div>
      )}

      {/* Plan toggle */}
      <div className="flex gap-1 rounded-lg border border-border bg-background-muted p-1">
        {(['solo', 'team'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setSelected(type)}
            className={`flex-1 rounded-md py-2 text-[13px] font-medium transition-colors capitalize ${
              selected === type
                ? 'bg-background text-foreground shadow-xs'
                : 'text-foreground-lighter hover:text-foreground'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Plan card */}
      <div className="rounded-xl border border-border bg-background-surface p-6">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-[16px] font-bold text-foreground capitalize">{selected}</p>
            <p className="mt-0.5 text-[12px] text-foreground-lighter">
              {selected === 'solo'
                ? 'For individual brands managing their own influencers'
                : 'For agencies and teams managing multiple brand clients'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[24px] font-bold text-foreground">
              ${selected === 'solo' ? PRICING.solo.workspacePrice : teamTotal}
            </span>
            <span className="text-[12px] text-foreground-lighter">/mo</span>
          </div>
        </div>

        <ul className="mt-5 flex flex-col gap-2">
          {(selected === 'solo' ? SOLO_FEATURES : TEAM_FEATURES).map((f) => (
            <li key={f} className="flex items-start gap-2 text-[13px] text-foreground-light">
              <Check size={14} className="mt-0.5 shrink-0 text-brand" weight="bold" />
              {f}
            </li>
          ))}
        </ul>

        {/* Extra workspaces (Team only) */}
        {selected === 'team' && (
          <div className="mt-5 rounded-lg border border-border bg-background px-4 py-3">
            <p className="mb-2 text-[12px] font-medium text-foreground">Need more than 3 workspaces?</p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={20}
                value={extra}
                onChange={(e) => setExtra(Math.max(0, parseInt(e.target.value) || 0))}
                className="h-9 w-20 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              <span className="text-[12px] text-foreground-lighter">extra workspaces</span>
            </div>
            <p className="mt-2 text-[12px] text-foreground-light">
              {PRICING.team.includedWorkspaces} included + {extra} extra ={' '}
              <span className="font-semibold text-foreground">${teamTotal}/month</span>
            </p>
          </div>
        )}
      </div>

      <SubscriptionCheckout
        accountType={selected}
        extraWorkspaces={extra}
        workspaceSlug={workspaceSlug}
      />

      <p className="text-center text-[12px] text-foreground-muted">
        Already subscribed?{' '}
        <Link href={`/${workspaceSlug}/settings?tab=billing`} className="underline hover:no-underline">
          Manage billing →
        </Link>
      </p>
    </div>
  )
}
