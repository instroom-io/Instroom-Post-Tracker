'use client'

import { motion } from 'framer-motion'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13 } },
}

const stepVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
}

const lineVariants = {
  hidden: { scaleY: 0 },
  visible: { scaleY: 1, transition: { duration: 0.3, delay: 0.1, ease: 'easeOut' as const } },
}

const steps = [
  {
    num: '01',
    category: 'Setup',
    title: 'Add your campaign influencers',
    description:
      'Import your influencer list from Instroom CRM or add them manually. Post Tracker knows exactly who it should be watching — no noise, no strangers.',
  },
  {
    num: '02',
    category: 'Configuration',
    title: 'Set your hashtags and mentions',
    description:
      'Define the branded hashtags and account mentions tied to the campaign. Post Tracker monitors Instagram, TikTok, and YouTube simultaneously from day one.',
  },
  {
    num: '03',
    category: 'Monitoring',
    title: 'Posts are captured automatically',
    description:
      'When a tracked influencer posts using your hashtag or tags your brand, Post Tracker logs it instantly — no manual checking, no missed deliverables.',
  },
  {
    num: '04',
    category: 'Content',
    title: 'Content downloads to your Drive',
    description:
      "For influencers who've granted usage rights, content is automatically downloaded and organized in your Google Drive — clean, labeled, ready to use.",
  },
  {
    num: '05',
    category: 'Outcome',
    title: 'Repurpose directly for paid ads',
    description:
      'Your UGC creative library builds itself. Pull assets directly into your paid ads workflow without chasing anyone for files or permission again.',
    isPayoff: true,
  },
]

export function HowItWorksSection() {
  return (
    <section className="py-20" id="how-it-works">
      <div className="mx-auto max-w-[1060px] px-[5%]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={containerVariants}
        >
          {/* Section header */}
          <motion.div variants={stepVariants}>
            <span className="text-[0.73rem] font-bold uppercase tracking-[0.12em] text-brand">
              How it works
            </span>
            <h2 className="mt-2 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.15] tracking-tight text-foreground">
              Set it up once.
              <br />
              It runs on its own.
            </h2>
            <p className="mt-3 max-w-[560px] text-[1rem] leading-[1.7] text-foreground-lighter">
              Post Tracker connects to your campaign influencers — not random strangers who used
              your hashtag. Only the people you worked with.
            </p>
          </motion.div>

          {/* Stepper */}
          <div className="mt-14 max-w-[660px]">
            {steps.map((step, index) => {
              const isLast = index === steps.length - 1

              return (
                <motion.div
                  key={step.num}
                  variants={stepVariants}
                  className="flex items-start gap-6"
                >
                  {/* Left: node + connector */}
                  <div className="flex w-10 flex-shrink-0 flex-col items-center">
                    <div
                      className={[
                        'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2',
                        step.isPayoff
                          ? 'border-brand bg-brand'
                          : 'border-border bg-background-surface dark:border-white/12 dark:bg-white/5',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'font-display text-[0.75rem] font-bold',
                          step.isPayoff ? 'text-white' : 'text-foreground-light',
                        ].join(' ')}
                      >
                        {step.num}
                      </span>
                    </div>

                    {!isLast && (
                      <motion.div
                        variants={lineVariants}
                        style={{ originY: 0 }}
                        className="mt-1.5 min-h-[40px] w-px flex-1 bg-border dark:bg-white/10"
                      />
                    )}
                  </div>

                  {/* Right: content */}
                  <div className={isLast ? 'pb-0' : 'pb-10'}>
                    {step.isPayoff ? (
                      <div className="rounded-xl bg-brand-muted px-5 py-4 dark:bg-brand/10">
                        <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-dark dark:text-brand">
                          {step.category}
                        </span>
                        <h3 className="mt-1.5 font-display text-[1.05rem] font-bold leading-snug tracking-tight text-foreground">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-[0.875rem] leading-relaxed text-foreground-lighter">
                          {step.description}
                        </p>
                      </div>
                    ) : (
                      <>
                        <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-foreground-muted">
                          {step.category}
                        </span>
                        <h3 className="mt-1.5 font-display text-[1.05rem] font-bold leading-snug tracking-tight text-foreground">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-[0.875rem] leading-relaxed text-foreground-lighter">
                          {step.description}
                        </p>
                      </>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
