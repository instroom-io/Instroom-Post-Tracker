'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useMarketingContact } from '@/components/marketing/marketing-contact-provider'
import { cn } from '@/lib/utils'

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }
const itemVariants = { hidden: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }

interface Tier {
  name: string
  price: string
  period: string | null
  popular: boolean
  contactCta: boolean
  features: string[]
}

const tiers: Tier[] = [
  {
    name: 'Starter',
    price: '€149',
    period: '/mo',
    popular: false,
    contactCta: false,
    features: [
      '3 brand workspaces',
      '5 team members',
      'Instagram + TikTok',
      '30-day post history',
      'Google Drive integration',
      'Email support',
    ],
  },
  {
    name: 'Growth',
    price: '€349',
    period: '/mo',
    popular: true,
    contactCta: false,
    features: [
      '10 brand workspaces',
      '20 team members',
      'All platforms (IG, TikTok, YouTube)',
      'Unlimited post history',
      'Priority support',
      'Custom EMV rates',
    ],
  },
  {
    name: 'Agency',
    price: '€749',
    period: '/mo',
    popular: false,
    contactCta: true,
    features: [
      'Unlimited workspaces',
      'Unlimited team members',
      'All platforms',
      'Custom CPM configuration',
      'Dedicated onboarding',
      'SLA guarantee',
    ],
  },
]

export function PricingSection() {
  const { setOpen } = useMarketingContact()

  return (
    <section id="pricing" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="font-display text-3xl lg:text-5xl font-bold text-foreground">
              Simple pricing for agencies of every size
            </h2>
            <p className="text-foreground-lighter text-lg mt-4">
              Indicative pricing — contact us for a custom quote.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start overflow-visible">
            {tiers.map((tier) => (
              <motion.div
                key={tier.name}
                variants={itemVariants}
                className={cn(
                  'marketing-card relative p-8',
                  tier.popular
                    ? 'border-brand/50 lg:scale-105 dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_60px_rgba(31,174,91,0.15),inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : ''
                )}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand text-white text-[10px] tracking-widest uppercase px-3 py-1 rounded-full font-semibold">
                    Most Popular
                  </span>
                )}

                <h3 className="font-display text-lg font-bold text-foreground">{tier.name}</h3>
                <div className="mt-4 mb-6">
                  <span className="font-display text-4xl font-bold text-foreground">{tier.price}</span>
                  {tier.period && (
                    <span className="text-foreground-lighter text-sm ml-1">{tier.period}</span>
                  )}
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={14} className="text-brand mt-0.5 shrink-0" />
                      <span className="text-foreground-light text-sm">{f}</span>
                    </li>
                  ))}
                </ul>

                {tier.contactCta ? (
                  <button
                    onClick={() => setOpen(true)}
                    className="w-full bg-background-muted text-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-border transition-all dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                  >
                    Contact Us
                  </button>
                ) : (
                  <button
                    onClick={() => setOpen(true)}
                    className={cn(
                      'w-full py-2.5 rounded-lg text-sm font-semibold transition-all',
                      tier.popular
                        ? 'bg-brand text-white hover:bg-brand/90 dark:hover:shadow-[0_0_20px_rgba(31,174,91,0.4)]'
                        : 'bg-background-muted text-foreground hover:bg-border dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
                    )}
                  >
                    Get Started
                  </button>
                )}
              </motion.div>
            ))}
          </div>

          <p className="text-center text-foreground-lighter text-sm mt-8">
            Managing 50+ brand clients?{' '}
            <button onClick={() => setOpen(true)} className="text-brand hover:underline">
              Contact our team
            </button>{' '}
            for a custom plan.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
