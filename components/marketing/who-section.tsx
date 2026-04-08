'use client'

import { motion } from 'framer-motion'
import { Storefront, Buildings, Briefcase, Check } from '@phosphor-icons/react'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const personas = [
  {
    icon: Storefront,
    label: 'Brands & eCommerce',
    title: 'The scaling eCommerce brand',
    description:
      "You're running influencer campaigns to grow your DTC brand. You can't afford to miss posts, and you need content you can turn into high-performing paid ads — fast.",
    bullets: [
      'Capture every influencer post automatically',
      'Build a UGC content library without the legwork',
      'Get campaign-ready creative in your Drive daily',
    ],
  },
  {
    icon: Buildings,
    label: 'Agencies',
    title: 'The influencer marketing agency',
    description:
      "You're managing multiple client campaigns simultaneously. Manual tracking doesn't scale — and clients expect full visibility, organized deliverables, and proof of completion.",
    bullets: [
      "Purchase your own plan or request access to a brand's existing account",
      'Manage all client brands from one login — no switching accounts',
      'Deliver organized content libraries and post logs per brand',
    ],
  },
  {
    icon: Briefcase,
    label: 'Freelancers',
    title: 'The ambitious freelancer',
    description:
      'You manage influencer campaigns for 2–5 clients and need to operate like an agency without the overhead. If your clients already have Post Tracker, just request access — no extra subscription needed.',
    bullets: [
      'Request access to clients\u2019 existing accounts in one click',
      'All brands accessible from your single login',
      'Impress clients with organized, professional deliverables',
    ],
  },
]

export function WhoSection() {
  return (
    <section className="bg-background-surface py-20">
      <div className="mx-auto max-w-[1060px] px-[5%]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
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
              adjusts to how you work — not the other way around.
            </p>
          </motion.div>

          <div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5">
            {personas.map((persona) => (
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
