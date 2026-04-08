'use client'

import { motion } from 'framer-motion'
import { Check, X } from '@phosphor-icons/react'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

type CellValue = 'yes' | 'no' | 'partial'

interface ComparisonRow {
  feature: string
  generic: CellValue
  crm: CellValue
  instroom: CellValue
}

const rows: ComparisonRow[] = [
  {
    feature: 'Monitors only your campaign influencers',
    generic: 'no',
    crm: 'no',
    instroom: 'yes',
  },
  {
    feature: 'Auto-downloads content to Google Drive',
    generic: 'no',
    crm: 'no',
    instroom: 'yes',
  },
  {
    feature: 'Usage rights tracking per influencer',
    generic: 'no',
    crm: 'partial',
    instroom: 'yes',
  },
  {
    feature: 'Instagram + TikTok + YouTube',
    generic: 'partial',
    crm: 'yes',
    instroom: 'yes',
  },
  {
    feature: 'Multi-brand / multi-client support',
    generic: 'no',
    crm: 'yes',
    instroom: 'yes',
  },
  {
    feature: 'Standalone pricing (no full CRM required)',
    generic: 'yes',
    crm: 'no',
    instroom: 'yes',
  },
  {
    feature: 'Built by a real influencer marketing agency',
    generic: 'no',
    crm: 'no',
    instroom: 'yes',
  },
]

function Cell({ value, highlighted }: { value: CellValue; highlighted?: boolean }) {
  if (value === 'yes') {
    return (
      <td
        className={
          highlighted
            ? 'bg-brand-dark/5 dark:bg-brand-dark/10 px-5 py-4 text-center align-middle'
            : 'px-5 py-4 text-center align-middle'
        }
      >
        <Check
          size={16}
          weight="bold"
          className={highlighted ? 'inline text-brand' : 'inline text-brand'}
        />
      </td>
    )
  }
  if (value === 'no') {
    return (
      <td
        className={
          highlighted
            ? 'bg-brand-dark/5 dark:bg-brand-dark/10 px-5 py-4 text-center align-middle'
            : 'px-5 py-4 text-center align-middle'
        }
      >
        <X size={16} weight="bold" className="inline text-border-strong dark:text-white/20" />
      </td>
    )
  }
  // partial
  return (
    <td
      className={
        highlighted
          ? 'bg-brand-dark/5 dark:bg-brand-dark/10 px-5 py-4 text-center align-middle'
          : 'px-5 py-4 text-center align-middle'
      }
    >
      <span className="text-[0.8rem] text-foreground-lighter">Partial</span>
    </td>
  )
}

export function ComparisonSection() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-[1060px] px-[5%]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          <motion.div variants={itemVariants}>
            <span className="text-[0.73rem] font-bold uppercase tracking-[0.12em] text-brand">
              Why Post Tracker
            </span>
            <h2 className="mt-2 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.15] tracking-tight text-foreground">
              Not just another
              <br />
              hashtag monitoring tool.
            </h2>
            <p className="mt-3 max-w-[560px] text-[1rem] leading-[1.7] text-foreground-lighter">
              Most tools track everyone who used a hashtag. Post Tracker tracks
              only the influencers you hired — and does the work after the post
              goes live.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-10 overflow-hidden rounded-[14px] border border-border">
            <table className="w-full border-collapse bg-background-surface">
              <thead>
                <tr>
                  <th className="bg-background-muted px-5 py-4 text-left text-[0.78rem] font-bold uppercase tracking-[0.06em] text-foreground-lighter dark:bg-white/5">
                    Feature
                  </th>
                  <th className="border-l border-border px-5 py-4 text-left text-[0.78rem] font-bold uppercase tracking-[0.06em] text-foreground-lighter dark:bg-white/5">
                    Generic trackers
                  </th>
                  <th className="border-l border-border px-5 py-4 text-left text-[0.78rem] font-bold uppercase tracking-[0.06em] text-foreground-lighter dark:bg-white/5">
                    Expensive CRMs
                  </th>
                  <th className="border-l border-border bg-brand-dark px-5 py-4 text-left text-[0.78rem] font-bold uppercase tracking-[0.06em] text-white/85">
                    Instroom Post Tracker
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={i < rows.length - 1 ? 'border-b border-border' : ''}
                  >
                    <td className="px-5 py-4 text-[0.875rem] text-foreground">
                      {row.feature}
                    </td>
                    <Cell value={row.generic} />
                    <Cell value={row.crm} />
                    <Cell value={row.instroom} highlighted />
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
