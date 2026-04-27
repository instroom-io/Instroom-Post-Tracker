'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Storefront, Buildings, Briefcase, Check } from '@phosphor-icons/react'

const personas = [
  {
    icon: Buildings,
    label: 'Agencies',
    title: 'The influencer marketing agency',
    description:
      'Manage every client brand from one login. Post Tracker handles the monitoring, downloading, and reporting. Your team stays focused on strategy, not admin.',
    bullets: [
      'All client brands in one login. No account switching.',
      'Deliver organized Drive libraries and post logs per brand',
      'Automated follow-ups when influencers miss their delivery window',
    ],
  },
  {
    icon: Storefront,
    label: 'Brands & eCommerce',
    title: 'The scaling eCommerce brand',
    description:
      "You're running influencer campaigns to grow your DTC brand. You can't afford to miss posts. And you need content you can actually run in paid ads.",
    bullets: [
      'Capture every influencer post automatically',
      'Build a UGC content library without the legwork',
      'Get campaign-ready creative in your Drive daily',
    ],
  },
  {
    icon: Briefcase,
    label: 'Freelancers',
    title: 'The ambitious freelancer',
    description:
      'You manage influencer campaigns for 2–5 clients and need to operate like an agency without the overhead. If your clients already have Post Tracker, request access. No extra subscription.',
    bullets: [
      "Request access to clients' existing accounts in one click",
      'All brands accessible from your single login',
      'Impress clients with organized, professional deliverables',
    ],
  },
]

export function WhoSection() {
  const shouldReduce = useReducedMotion()

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduce ? 0 : 0.1 } },
  }
  const itemVariants = {
    hidden: shouldReduce ? {} : { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  const [agencies, ...secondaryPersonas] = personas

  return (
    <section className="bg-background-surface py-20">
      <div className="mx-auto max-w-[1060px] px-[5%]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {/* Section header */}
          <motion.div variants={itemVariants}>
            <span className="text-[0.73rem] font-bold uppercase tracking-[0.12em] text-brand">
              Who it&apos;s for
            </span>
            <h2 className="mt-2 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.15] tracking-tight text-foreground">
              Built for everyone
              <br />
              managing influencer campaigns.
            </h2>
            <p className="mt-3 max-w-[560px] text-[1rem] leading-[1.7] text-foreground-lighter">
              Whether you&apos;re running one brand or twenty, Post Tracker
              works the way you do. Not the other way around.
            </p>
          </motion.div>

          {/* Featured Agencies card — full width */}
          <motion.div
            variants={itemVariants}
            className="mt-12 mb-5 rounded-[14px] border border-border bg-background-overlay p-8 dark:border-white/8 dark:bg-white/5 md:flex md:items-start md:gap-12"
          >
            <div className="md:flex-1">
              <div className="mb-4 text-brand">
                <agencies.icon size={28} weight="duotone" />
              </div>
              <span className="text-[0.75rem] font-bold uppercase tracking-[0.08em] text-brand">
                {agencies.label}
              </span>
              <h3 className="mt-1.5 mb-3 font-display text-[1.15rem] font-bold tracking-tight text-foreground">
                {agencies.title}
              </h3>
              <p className="text-[0.9rem] leading-relaxed text-foreground-lighter">
                {agencies.description}
              </p>
            </div>
            <ul className="mt-6 space-y-2.5 md:mt-0 md:w-[280px] md:shrink-0">
              {agencies.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2">
                  <Check
                    size={14}
                    weight="bold"
                    className="mt-0.5 shrink-0 text-brand"
                  />
                  <span className="text-[0.85rem] leading-snug text-foreground-lighter">
                    {bullet}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Brands + Freelancers — 2-col secondary cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {secondaryPersonas.map((persona) => (
              <motion.div
                key={persona.title}
                variants={itemVariants}
                className="rounded-[14px] border border-border bg-background p-7 dark:border-white/8 dark:bg-white/5"
              >
                <div className="mb-4 text-brand">
                  <persona.icon size={26} weight="duotone" />
                </div>
                <span className="text-[0.75rem] font-bold uppercase tracking-[0.08em] text-brand">
                  {persona.label}
                </span>
                <h3 className="mt-1 mb-2 font-display text-[1rem] font-bold tracking-tight text-foreground">
                  {persona.title}
                </h3>
                <p className="mb-3 text-[0.875rem] leading-relaxed text-foreground-lighter">
                  {persona.description}
                </p>
                <ul className="space-y-1.5">
                  {persona.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <Check
                        size={14}
                        weight="bold"
                        className="mt-0.5 shrink-0 text-brand"
                      />
                      <span className="text-[0.84rem] leading-snug text-foreground-lighter">
                        {bullet}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
