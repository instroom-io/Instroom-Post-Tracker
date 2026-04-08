'use client'

import { motion } from 'framer-motion'
import {
  MagnifyingGlass,
  FilmSlate,
  FileText,
  UploadSimple,
  Warning,
  ShieldWarning,
} from '@phosphor-icons/react'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
}

const painPoints = [
  {
    icon: MagnifyingGlass,
    title: 'Manual post hunting',
    description:
      'Checking tagged posts, scrolling through hashtags, monitoring notifications — every single day, for every single influencer in your campaign.',
  },
  {
    icon: FilmSlate,
    title: 'Watermarked content, useless for ads',
    description:
      "You download the video straight from the platform and it comes stamped with a TikTok or Instagram watermark. You can't run that in paid ads — so you're back to chasing the influencer for the original file.",
  },
  {
    icon: FileText,
    title: 'Chasing influencers for files',
    description:
      'Following up for raw files and post links. Days of back-and-forth for content you already paid for — and sometimes you never get it.',
  },
  {
    icon: UploadSimple,
    title: 'The Drive upload grind',
    description:
      'Download. Rename. Create the folder. Upload. Repeat for every influencer, every post, every campaign. Hours of admin nobody planned for.',
  },
  {
    icon: Warning,
    title: 'Posts you missed entirely',
    description:
      "An influencer posted. You didn't catch it. The campaign window closed. That content — and its potential as a paid ad creative — is now gone.",
  },
  {
    icon: ShieldWarning,
    title: 'Usage rights left in limbo',
    description:
      "You got verbal permission to repurpose content. But where's the record? No system, no proof, no organized library — just scattered DMs.",
  },
]

export function PainSection() {
  return (
    <section className="bg-marketing-dark py-20" id="pain">
      <div className="mx-auto max-w-[1060px] px-[5%]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
        >
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

          <div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
            {painPoints.map((point) => (
              <motion.div
                key={point.title}
                variants={itemVariants}
                className="rounded-xl border border-white/8 bg-white/5 p-6 backdrop-blur-sm"
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15">
                  <point.icon size={18} weight="duotone" className="text-brand" />
                </div>
                <h3 className="mb-2 font-display text-[0.95rem] font-bold text-white">
                  {point.title}
                </h3>
                <p className="text-[0.85rem] leading-relaxed text-white/45">
                  {point.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
