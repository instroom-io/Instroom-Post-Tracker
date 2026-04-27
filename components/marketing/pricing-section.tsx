'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { Check } from '@phosphor-icons/react'
import { PRICING } from '@/lib/billing/pricing'
import type { BillingPeriod } from '@/lib/billing/pricing'

const SOLO_FEATURES = [
  '1 workspace',
  'Unlimited users: Admin, Manager, Viewer all included',
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

export function PricingSection() {
  const [period, setPeriod] = useState<BillingPeriod>('monthly')
  const shouldReduce = useReducedMotion()

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduce ? 0 : 0.1 } },
  }
  const itemVariants = {
    hidden: shouldReduce ? {} : { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  const soloPrice = PRICING.solo[period]
  const teamPrice = PRICING.team[period]

  return (
    <section id="pricing" className="py-20">
      <div className="mx-auto max-w-[1060px] px-[5%]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div variants={itemVariants} className="text-center">
            <span className="text-[0.73rem] font-bold uppercase tracking-[0.12em] text-brand">
              Pricing
            </span>
            <h2 className="mt-2 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.15] tracking-tight text-foreground">
              Simple per-workspace pricing.
              <br />
              All users included free.
            </h2>
            <p className="mx-auto mt-3 max-w-[560px] text-[1rem] leading-[1.7] text-foreground-lighter">
              You pay for the workspaces you own. Not per seat. Add as many
              Admins, Managers, and Viewers as you need at no extra cost.
            </p>

            {/* Billing period toggle */}
            <div className="mt-6 flex items-center justify-center gap-3">
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
                <span className="rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">Save ~21%</span>
              </button>
            </div>
          </motion.div>

          <div className="mx-auto mt-12 grid w-full max-w-[720px] grid-cols-1 gap-5 md:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
            {/* Solo card */}
            <motion.div
              variants={itemVariants}
              className="relative rounded-[16px] border-[1.5px] border-border bg-background-surface p-8 dark:border-white/10 dark:bg-white/5"
            >
              <h3 className="font-display text-[0.9rem] font-bold uppercase tracking-[0.08em] text-foreground-lighter">
                Solo
              </h3>
              <p className="mt-1 text-[0.82rem] text-foreground-muted">
                For individual brands managing their own influencers
              </p>
              <div className="mt-4 mb-1 font-display text-[2.4rem] font-bold leading-none tracking-tight text-foreground">
                ${soloPrice}
              </div>
              <p className="mb-6 text-[0.8rem] text-foreground-lighter">
                per month{period === 'annual' ? `, billed annually · $${soloPrice * 12}/year` : ''}
              </p>

              <ul className="mb-7 space-y-0">
                {SOLO_FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 border-b border-border py-[0.35rem] text-[0.86rem] text-foreground last:border-0"
                  >
                    <Check size={14} weight="bold" className="mt-0.5 shrink-0 text-brand" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="block w-full rounded-[9px] border-[1.5px] border-brand py-[0.85rem] text-center text-[0.9rem] font-semibold text-brand-dark transition-colors hover:bg-brand/5 dark:text-brand"
              >
                Start free trial →
              </Link>
            </motion.div>

            {/* Team card — highlighted */}
            <motion.div
              variants={itemVariants}
              className="relative rounded-[16px] bg-brand-dark p-8"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[#07130b]">
                Most popular
              </div>

              <h3 className="font-display text-[0.9rem] font-bold uppercase tracking-[0.08em] text-white/60">
                Team
              </h3>
              <p className="mt-1 text-[0.82rem] text-white/50">
                For agencies and teams managing multiple brand clients
              </p>
              <div className="mt-4 mb-1 font-display text-[2.4rem] font-bold leading-none tracking-tight text-white">
                ${teamPrice}
              </div>
              <p className="mb-6 text-[0.8rem] text-white/50">
                per month{period === 'annual' ? `, billed annually · $${teamPrice * 12}/year` : ''}
              </p>

              <ul className="mb-7 space-y-0">
                {TEAM_FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 border-b border-white/8 py-[0.35rem] text-[0.86rem] text-white/85 last:border-0"
                  >
                    <Check size={14} weight="bold" className="mt-0.5 shrink-0 text-white/70" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="block w-full rounded-[9px] bg-brand py-[0.85rem] text-center text-[0.9rem] font-semibold text-[#07130b] transition-colors hover:bg-brand/90"
              >
                Start free trial →
              </Link>
            </motion.div>
          </div>

          <motion.p
            variants={itemVariants}
            className="mt-8 text-center text-[0.82rem] text-foreground-lighter"
          >
            Shared workspaces: if a brand invites you to their workspace, you join as a Manager at no cost. It doesn&apos;t count against your quota.
            <br className="hidden sm:block" />
            <span className="mt-1 block sm:inline sm:mt-0">
              {' '}All plans include a 14-day free trial. No credit card required.
            </span>
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
