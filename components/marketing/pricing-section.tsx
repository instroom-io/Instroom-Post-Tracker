'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check } from '@phosphor-icons/react'
import { useMarketingContact } from '@/components/marketing/marketing-contact-provider'
import { cn } from '@/lib/utils'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

interface PricingTier {
  name: string
  price: string
  period: string
  popular: boolean
  features: string[]
}

const tiers: PricingTier[] = [
  {
    name: 'Starter',
    price: '$29',
    period: 'per month, billed monthly',
    popular: false,
    features: [
      'Up to 3 brands',
      '25 tracked influencers',
      'Instagram + TikTok',
      'Hashtag + mention tracking',
      'Google Drive sync',
      '30-day post history',
    ],
  },
  {
    name: 'Pro',
    price: '$79',
    period: 'per month, billed monthly',
    popular: true,
    features: [
      'Up to 10 brands',
      '100 tracked influencers',
      'Instagram + TikTok + YouTube',
      'Hashtag + mention tracking',
      'Auto content download',
      'Usage rights management',
      'Paid ads–ready UGC library',
      '90-day post history',
    ],
  },
  {
    name: 'Agency',
    price: '$149',
    period: 'per month, billed monthly',
    popular: false,
    features: [
      'Unlimited brands',
      '300 tracked influencers',
      'All platforms',
      'Full auto-download',
      'Team collaboration',
      'Isolated client workspaces',
      'Priority support',
    ],
  },
]

export function PricingSection() {
  const { setOpen } = useMarketingContact()

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
              Pay for what you use.
              <br />
              Not what you don&apos;t.
            </h2>
            <p className="mx-auto mt-3 max-w-[560px] text-[1rem] leading-[1.7] text-foreground-lighter">
              Post Tracker is a standalone tool. No bloated CRM. No features
              you&apos;ll never open. Just clean post tracking that works — or
              bundle it with Instroom CRM at a discount.
            </p>
          </motion.div>

          <div className="mx-auto mt-12 max-w-[900px] grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5 overflow-visible">
            {tiers.map((tier) => (
              <motion.div
                key={tier.name}
                variants={itemVariants}
                className={cn(
                  'relative rounded-[16px] p-8',
                  tier.popular
                    ? 'bg-brand-dark'
                    : 'border-[1.5px] border-border bg-background-surface dark:border-white/10 dark:bg-white/5'
                )}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-white">
                    Most popular
                  </div>
                )}

                <h3
                  className={cn(
                    'font-display text-[0.9rem] font-bold uppercase tracking-[0.08em]',
                    tier.popular ? 'text-white/60' : 'text-foreground-lighter'
                  )}
                >
                  {tier.name}
                </h3>

                <div className="mt-3 mb-1 font-display text-[2.4rem] font-bold leading-none tracking-tight">
                  <span className={tier.popular ? 'text-white' : 'text-foreground'}>
                    {tier.price}
                  </span>
                </div>
                <p
                  className={cn(
                    'mb-6 text-[0.8rem]',
                    tier.popular ? 'text-white/50' : 'text-foreground-lighter'
                  )}
                >
                  {tier.period}
                </p>

                <ul className="mb-7 space-y-0">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className={cn(
                        'flex items-start gap-2 border-b py-[0.35rem] text-[0.86rem] last:border-0',
                        tier.popular
                          ? 'border-white/8 text-white/85'
                          : 'border-border text-foreground'
                      )}
                    >
                      <Check
                        size={14}
                        weight="bold"
                        className={cn(
                          'mt-0.5 shrink-0',
                          tier.popular ? 'text-white/70' : 'text-brand'
                        )}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={cn(
                    'block w-full rounded-[9px] py-[0.85rem] text-center text-[0.9rem] font-semibold transition-colors',
                    tier.popular
                      ? 'bg-brand text-white hover:bg-brand/90'
                      : 'border-[1.5px] border-brand text-brand-dark hover:bg-brand/5 dark:text-brand'
                  )}
                >
                  Get started
                </Link>
              </motion.div>
            ))}
          </div>

          <motion.p
            variants={itemVariants}
            className="mt-6 text-center text-[0.82rem] text-foreground-lighter"
          >
            Already on Instroom CRM? Bundle Post Tracker at a discounted rate.{' '}
            <button
              onClick={() => setOpen(true)}
              className="font-semibold text-brand hover:underline"
            >
              Talk to us →
            </button>
          </motion.p>
        </motion.div>
      </div>
    </section>
  )
}
