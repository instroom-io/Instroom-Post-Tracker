'use client'

import { motion, useReducedMotion } from 'framer-motion'
import {
  MagnifyingGlass,
  FilmSlate,
  FileText,
  UploadSimple,
  Warning,
  ShieldWarning,
} from '@phosphor-icons/react'

const painPoints = [
  {
    icon: MagnifyingGlass,
    title: "You're checking profiles manually",
    description:
      'Every day, someone on your team opens Instagram or TikTok to check if an influencer posted. That time adds up. Posts still get missed.',
  },
  {
    icon: FilmSlate,
    title: 'Content comes back watermarked',
    description:
      "TikTok watermarks are burned in. Without a proper download pipeline, the UGC you paid for isn't usable in paid ads.",
  },
  {
    icon: FileText,
    title: 'Chasing influencers for deliverables',
    description:
      'Day 10, still no post. No system to know when to follow up, who to contact, or how late they actually are.',
  },
  {
    icon: UploadSimple,
    title: 'Manually uploading to Drive',
    description:
      'Someone downloads the video, renames it, drags it into the right folder. Every. Single. Post.',
  },
  {
    icon: Warning,
    title: 'Posts fall through the cracks',
    description:
      "One influencer posts at 2am. Nobody sees it. It doesn't get logged. You find out weeks later when the client asks.",
  },
  {
    icon: ShieldWarning,
    title: 'Usage rights tracked in a spreadsheet',
    description:
      'Granting usage rights should unlock downloads automatically. Instead, it\'s a note in a Google Sheet that someone might check.',
  },
]

export function PainSection() {
  const shouldReduce = useReducedMotion()

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduce ? 0 : 0.08 } },
  }
  const itemVariants = {
    hidden: shouldReduce ? {} : { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
  }

  return (
    <section className="bg-marketing-dark py-20" id="pain">
      <div className="mx-auto max-w-[1060px] px-[5%]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
          {/* Section header */}
          <motion.div variants={itemVariants}>
            <span className="text-[0.73rem] font-bold uppercase tracking-[0.12em] text-brand">
              Sound familiar?
            </span>
            <h2 className="mt-2 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.15] tracking-tight text-white">
              You ran the campaign.
              <br />
              Now the real work begins.
            </h2>
            <p className="mt-3 max-w-[560px] text-[1rem] leading-[1.7] text-white/50">
              After 5 years running influencer campaigns at an agency, we know
              this story by heart. And we got tired of living it.
            </p>
          </motion.div>

          {/* All 6 pain points — unified row grid */}
          <div className="mt-12 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
            {painPoints.map((point) => (
              <motion.div
                key={point.title}
                variants={itemVariants}
                className="flex gap-5 border-t border-white/[0.08] py-7"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                  <point.icon size={16} weight="duotone" className="text-brand" />
                </div>
                <div>
                  <h3 className="mb-1.5 font-display text-[0.9375rem] font-semibold leading-snug text-white">
                    {point.title}
                  </h3>
                  <p className="text-[0.8125rem] leading-relaxed text-white/50">
                    {point.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
