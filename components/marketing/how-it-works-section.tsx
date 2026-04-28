'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

const steps = [
  {
    num: '01',
    category: 'Setup',
    title: 'Add your campaign influencers',
    description:
      'Import your influencer list from Instroom CRM or add them manually. Post Tracker knows exactly who to watch. No noise, no strangers.',
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
      'When a tracked influencer posts using your hashtag or tags your brand, Post Tracker logs it instantly. No manual checking. No missed deliverables.',
  },
  {
    num: '04',
    category: 'Content',
    title: 'Content downloads to your Drive',
    description:
      "For influencers who've granted usage rights, content is automatically downloaded and organized in your Google Drive. Clean, labeled, ready to use.",
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

// Expo-out — fast start, sharp deceleration. Snappy and premium.
const EXPO_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1]

// Per-step timing offsets (seconds)
const STEP_INTERVAL = 0.42  // time between each step starting
const NODE_DURATION = 0.45
const CONTENT_OFFSET = 0.12 // content starts after node
const CONTENT_DURATION = 0.48
const LINE_OFFSET = 0.26    // line draws after node
const LINE_DURATION = 0.52

export function HowItWorksSection() {
  const shouldReduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.1 })

  return (
    <section className="py-20" id="how-it-works">
      <div className="mx-auto max-w-[1060px] px-[5%]">
        {/* Section header */}
        <motion.div
          initial={shouldReduce ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <span className="text-[0.73rem] font-bold uppercase tracking-[0.12em] text-brand">
            How it works
          </span>
          <h2 className="mt-2 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.15] tracking-tight text-foreground">
            Set it up once.
            <br />
            It runs on its own.
          </h2>
          <p className="mt-3 max-w-[560px] text-[1rem] leading-[1.7] text-foreground-lighter">
            Post Tracker connects to your campaign influencers, not random strangers who used
            your hashtag. Only the people you worked with.
          </p>
        </motion.div>

        {/* Stepper */}
        <div ref={ref} className="mt-14 max-w-[660px]">
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1
            const base = shouldReduce ? 0 : index * STEP_INTERVAL

            return (
              <div key={step.num} className="flex items-start gap-6">
                {/* Left: node + connector */}
                <div className="flex w-10 flex-shrink-0 flex-col items-center">

                  {/* Step circle — snaps in with expo-out scale */}
                  <motion.div
                    initial={shouldReduce ? {} : { scale: 0.35, opacity: 0 }}
                    animate={
                      isInView
                        ? { scale: 1, opacity: 1 }
                        : { scale: 0.35, opacity: 0 }
                    }
                    transition={{
                      duration: NODE_DURATION,
                      delay: base,
                      ease: EXPO_OUT,
                    }}
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
                  </motion.div>

                  {/* Connector line — draws downward after the node appears */}
                  {!isLast && (
                    <motion.div
                      initial={shouldReduce ? {} : { scaleY: 0 }}
                      animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
                      transition={{
                        duration: LINE_DURATION,
                        delay: base + LINE_OFFSET,
                        ease: [0.4, 0, 0.2, 1],
                      }}
                      style={{ originY: 0 }}
                      className="mt-1.5 min-h-[40px] w-px flex-1 bg-border dark:bg-white/10"
                    />
                  )}
                </div>

                {/* Right: content — slides in from left after the node */}
                <motion.div
                  initial={shouldReduce ? {} : { opacity: 0, x: -14 }}
                  animate={
                    isInView
                      ? { opacity: 1, x: 0 }
                      : { opacity: 0, x: -14 }
                  }
                  transition={{
                    duration: CONTENT_DURATION,
                    delay: base + CONTENT_OFFSET,
                    ease: 'easeOut',
                  }}
                  className={isLast ? 'w-full pb-0' : 'w-full pb-10'}
                >
                  {step.isPayoff ? (
                    /* Payoff step — scales in slightly for extra emphasis */
                    <motion.div
                      initial={shouldReduce ? {} : { scale: 0.96 }}
                      animate={isInView ? { scale: 1 } : { scale: 0.96 }}
                      transition={{
                        duration: 0.6,
                        delay: base + CONTENT_OFFSET,
                        ease: EXPO_OUT,
                      }}
                      className="rounded-xl bg-brand-muted px-5 py-4 dark:bg-brand/10"
                    >
                      <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-dark dark:text-brand">
                        {step.category}
                      </span>
                      <h3 className="mt-1.5 font-display text-[1.05rem] font-bold leading-snug tracking-tight text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-[0.875rem] leading-relaxed text-foreground-lighter">
                        {step.description}
                      </p>
                    </motion.div>
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
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
