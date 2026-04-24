'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CheckCircle, Check } from '@phosphor-icons/react'
import { SubscriptionCheckout } from '@/components/billing/subscription-checkout'
import { PRICING, getSoloPrice, calcTeamTotal, getExtraWorkspacePrice, calcAnnualTotal } from '@/lib/billing/pricing'
import type { PlanType } from '@/lib/utils/plan'
import type { BillingPeriod } from '@/lib/billing/pricing'

interface UpgradeClientProps {
  workspaceSlug: string
  plan: PlanType
  accountType: 'solo' | 'team'
  success: boolean
  cancelled: boolean
  successType: 'solo' | 'team'
  successTotal?: number
  successPeriod?: BillingPeriod
}

const SOLO_FEATURES = [
  '1 workspace',
  'Unlimited users — Admin, Manager, Viewer all free',
  'Post tracking, Drive sync, analytics, usage rights',
  '14-day free trial, no credit card required',
]

const TEAM_FEATURES = [
  '3 workspaces included',
  '+$10/month per additional workspace',
  'Unlimited users across all workspaces',
  'Multi-workspace admin dashboard',
  'All Solo features included',
  '14-day free trial, no credit card required',
]

const MAX_POLL_MS = 45_000

export function UpgradeClient({
  workspaceSlug,
  plan,
  accountType,
  success,
  cancelled,
  successType,
  successTotal,
  successPeriod = 'monthly',
}: UpgradeClientProps) {
  const [selected, setSelected] = useState<'solo' | 'team'>(accountType)
  const [period, setPeriod] = useState<BillingPeriod>('monthly')
  const [extra, setExtra] = useState(0)
  const [pollingTimedOut, setPollingTimedOut] = useState(false)
  const router = useRouter()

  // Webhook-only activation: poll until plan becomes 'pro' after successful checkout.
  // Times out after 45s in case the webhook is delayed or fails to deliver.
  useEffect(() => {
    if (success && plan !== 'pro') {
      const deadline = Date.now() + MAX_POLL_MS
      const id = setInterval(() => {
        if (Date.now() > deadline) {
          clearInterval(id)
          setPollingTimedOut(true)
          return
        }
        router.refresh()
      }, 2000)
      return () => clearInterval(id)
    }
  }, [success, plan, router])

  if (success) {
    // Waiting for webhook to activate the subscription
    if (plan !== 'pro') {
      if (pollingTimedOut) {
        return (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-[14px] font-medium text-foreground">Activation is taking longer than usual</p>
            <p className="text-[12px] text-foreground-lighter max-w-xs">
              If you completed payment, your subscription will activate shortly. You can refresh this page or check your billing settings.
            </p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <button
                onClick={() => { setPollingTimedOut(false); router.refresh() }}
                className="flex h-10 w-full items-center justify-center rounded-lg bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand/90"
              >
                Refresh page
              </button>
              <Link
                href={`/${workspaceSlug}/settings?tab=billing`}
                className="flex h-10 w-full items-center justify-center rounded-lg border border-border bg-background px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-background-muted"
              >
                View billing settings →
              </Link>
            </div>
            <p className="text-[11px] text-foreground-muted">
              Need help?{' '}
              <a href="mailto:hello@armfulmedia.com" className="underline hover:no-underline">Contact support</a>
            </p>
          </div>
        )
      }

      return (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-brand" />
          <p className="text-[14px] font-medium text-foreground">Activating your subscription…</p>
          <p className="text-[12px] text-foreground-lighter">This usually takes a few seconds.</p>
        </div>
      )
    }

    const total = successTotal ?? (successPeriod === 'annual'
      ? calcAnnualTotal(successType, 0)
      : successType === 'solo' ? getSoloPrice('monthly') : calcTeamTotal(0, 'monthly'))
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
            {successType === 'solo' ? 'Solo' : 'Team'} · {workspaceCount} workspace{workspaceCount !== 1 ? 's' : ''} · ${total}/{successPeriod === 'annual' ? 'year' : 'month'}
          </p>
          {successPeriod === 'annual' && (
            <p className="mt-0.5 text-[11px] text-foreground-muted">Billed annually</p>
          )}
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

  const teamTotal = calcTeamTotal(extra, period)
  const soloPrice = getSoloPrice(period)
  const extraPrice = getExtraWorkspacePrice(period)

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

      {/* Billing period toggle */}
      <div data-testid="billing-period-toggle" className="flex items-center justify-center gap-3">
        <button
          onClick={() => setPeriod('monthly')}
          className={`text-[13px] font-medium transition-colors ${period === 'monthly' ? 'text-foreground' : 'text-foreground-muted hover:text-foreground'}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setPeriod(period === 'monthly' ? 'annual' : 'monthly')}
          className={`relative h-6 w-11 overflow-hidden rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${period === 'annual' ? 'bg-brand' : 'bg-border-strong'}`}
          aria-label="Toggle billing period"
        >
          <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${period === 'annual' ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
        </button>
        <button
          onClick={() => setPeriod('annual')}
          className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors ${period === 'annual' ? 'text-foreground' : 'text-foreground-muted hover:text-foreground'}`}
        >
          Annual
          <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                Save ~{Math.round((1 - (selected === 'solo' ? PRICING.solo.annual / PRICING.solo.monthly : PRICING.team.annual / PRICING.team.monthly)) * 100)}%
              </span>
        </button>
      </div>

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
      <div
        data-testid={selected === 'solo' ? 'upgrade-solo-section' : undefined}
        className="rounded-xl border border-border bg-background-surface p-6"
      >
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
            <div className="flex items-baseline gap-0.5">
              <span className="text-[24px] font-bold text-foreground">
                ${selected === 'solo' ? soloPrice : teamTotal}
              </span>
              <span className="text-[12px] text-foreground-lighter">/mo</span>
            </div>
            {period === 'annual' && (
              <p className="text-[10px] text-foreground-muted">
                ${(selected === 'solo' ? soloPrice : teamTotal) * 12}/year billed annually
              </p>
            )}
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
              <span className="text-[12px] text-foreground-lighter">
                extra workspaces · +${extraPrice}/mo each
              </span>
            </div>
            <p className="mt-2 text-[12px] text-foreground-light">
              {PRICING.team.includedWorkspaces} included + {extra} extra ={' '}
              <span className="font-semibold text-foreground">${teamTotal}/mo</span>
              {period === 'annual' && (
                <span className="text-foreground-muted"> · ${teamTotal * 12}/year</span>
              )}
            </p>
          </div>
        )}
      </div>

      <SubscriptionCheckout
        accountType={selected}
        extraWorkspaces={extra}
        billingPeriod={period}
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
