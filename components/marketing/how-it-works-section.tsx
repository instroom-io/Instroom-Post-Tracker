'use client'

import { motion } from 'framer-motion'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const steps = [
  {
    num: '01',
    title: 'Add your campaign influencers',
    description:
      'Import your influencer list from Instroom CRM or add them manually. Post Tracker knows exactly who it should be watching — no noise, no strangers.',
  },
  {
    num: '02',
    title: 'Set your hashtags and mentions',
    description:
      'Define the branded hashtags and account mentions tied to the campaign. Post Tracker monitors Instagram, TikTok, and YouTube simultaneously from day one.',
  },
  {
    num: '03',
    title: 'Posts are captured automatically',
    description:
      'When a tracked influencer posts using your hashtag or tags your brand, Post Tracker logs it instantly — no manual checking, no missed deliverables.',
  },
  {
    num: '04',
    title: 'Content downloads to your Drive',
    description:
      "For influencers who've granted usage rights, content is automatically downloaded and organized in your Google Drive — clean, labeled, ready to use.",
  },
  {
    num: '05',
    title: 'Repurpose directly for paid ads',
    description:
      'Your UGC creative library builds itself. Pull assets directly into your paid ads workflow without chasing anyone for files or permission again.',
  },
]

export function HowItWorksSection() {
  return (
    <section className="py-20" id="how-it-works">
      <div className="mx-auto max-w-[1060px] px-[5%]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div variants={itemVariants}>
            <span className="text-[0.73rem] font-bold uppercase tracking-[0.12em] text-brand">
              How it works
            </span>
            <h2 className="mt-2 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.15] tracking-tight text-foreground">
              Set it up once.
              <br />
              It runs on its own.
            </h2>
            <p className="mt-3 max-w-[560px] text-[1rem] leading-[1.7] text-foreground-lighter">
              Post Tracker connects to your campaign influencers — not random
              strangers who used your hashtag. Only the people you worked with.
            </p>
          </motion.div>

          <div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-8">
            {steps.map((step) => (
              <motion.div
                key={step.num}
                variants={itemVariants}
                className="border-l-2 border-border pl-4 dark:border-white/10"
              >
                <span className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-brand">
                  Step {step.num}
                </span>
                <h3 className="mt-1 mb-2 font-display text-[1.05rem] font-bold tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="text-[0.875rem] leading-relaxed text-foreground-lighter">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
