'use client'

import { motion, useReducedMotion, type Variants } from 'framer-motion'
import {
  MagnifyingGlass,
  FilmSlate,
  FileText,
  UploadSimple,
  Warning,
  ShieldWarning,
} from '@phosphor-icons/react'

type AccentKey = 'green' | 'amber' | 'indigo'

const accentStyles: Record<AccentKey, { bg: string; color: string }> = {
  green:  { bg: 'rgba(31,174,91,0.12)',   color: '#1FAE5B' },
  amber:  { bg: 'rgba(244,183,64,0.12)',  color: '#F4B740' },
  indigo: { bg: 'rgba(91,111,230,0.12)',  color: '#5B6FE6' },
}


const cardVariants: Variants = {
  rest:  { y: 0 },
  hover: { y: -4, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] as const } },
}

const painPoints = [
  {
    icon: MagnifyingGlass,
    accent: 'green' as AccentKey,
    title: "You're checking profiles manually",
    description:
      'Every day, someone opens Instagram or TikTok to check if an influencer posted. That time adds up, and posts still get missed.',
  },
  {
    icon: FilmSlate,
    accent: 'amber' as AccentKey,
    title: 'Content comes back watermarked',
    description:
      "TikTok watermarks are burned in. Without a proper download pipeline, the UGC you paid for isn't usable in paid ads.",
  },
  {
    icon: FileText,
    accent: 'indigo' as AccentKey,
    title: 'Chasing influencers for deliverables',
    description:
      'Day 10, still no post. No system to know when to follow up, who to contact, or how late they actually are.',
  },
  {
    icon: UploadSimple,
    accent: 'indigo' as AccentKey,
    title: 'Manually uploading to Drive',
    description:
      'Someone downloads the video, renames it, drags it into the right folder. Every. Single. Post.',
  },
  {
    icon: Warning,
    accent: 'amber' as AccentKey,
    title: 'Posts fall through the cracks',
    description:
      "One influencer posts at 2am. Nobody sees it. It doesn't get logged. You find out weeks later when the client asks.",
  },
  {
    icon: ShieldWarning,
    accent: 'green' as AccentKey,
    title: 'Usage rights tracked in a spreadsheet',
    description:
      "Granting usage rights should unlock downloads automatically. Instead, it's a note in a Google Sheet that someone might check.",
  },
]

export function PainSection() {
  const shouldReduce = useReducedMotion()

  const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduce ? 0 : 0.07 } },
  }
  const itemVariants: Variants = {
    hidden:  shouldReduce ? {} : { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
  }

  return (
    <section className="bg-marketing-dark py-24" id="pain">
      <div className="mx-auto max-w-[1060px] px-[5%]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.12 }}
        >
          {/* Section header */}
          <motion.div variants={itemVariants} className="mb-12">
            <span className="text-[0.73rem] font-bold uppercase tracking-[0.12em] text-brand">
              Sound familiar?
            </span>
            <h2 className="mt-2 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.15] tracking-tight text-white">
              You ran the campaign.
              <br />
              Now the real work begins.
            </h2>
            <p className="mt-3 max-w-[520px] text-[1rem] leading-[1.7] text-white/50">
              After 5 years running influencer campaigns at an agency, we know
              this story by heart. And we got tired of living it.
            </p>
          </motion.div>

          {/* Card grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {painPoints.map((point) => {
              const accent = accentStyles[point.accent]

              return (
                <motion.div key={point.title} variants={itemVariants}>
                  <motion.div
                    initial="rest"
                    whileHover="hover"
                    variants={shouldReduce ? undefined : cardVariants}
                    className="flex h-full cursor-default flex-col gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 transition-colors duration-200 hover:border-white/[0.14] hover:bg-white/[0.07]"
                  >
                    {/* Icon container */}
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: accent.bg }}
                    >
                      <point.icon size={18} weight="duotone" style={{ color: accent.color }} />
                    </div>

                    {/* Copy */}
                    <div>
                      <h3 className="mb-1.5 font-display text-[0.9375rem] font-semibold leading-snug text-white">
                        {point.title}
                      </h3>
                      <p className="text-[0.8125rem] leading-relaxed text-white/50">
                        {point.description}
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
