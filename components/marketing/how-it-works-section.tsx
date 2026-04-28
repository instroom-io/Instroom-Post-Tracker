'use client'

import { useEffect, useRef, useState } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useMotionValueEvent,
  type MotionValue,
} from 'framer-motion'

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

type Step = (typeof steps)[number]

function StepNode({
  step,
  scrollYProgress,
  threshold,
  shouldReduce,
  isPayoff,
}: {
  step: Step
  scrollYProgress: MotionValue<number>
  threshold: number
  shouldReduce: boolean | null
  isPayoff: boolean
}) {
  const lo = Math.max(0, threshold - 0.06)
  const hi = Math.min(1, threshold + 0.06)
  const active = useTransform(scrollYProgress, [lo, hi], [0, 1])
  const [isActive, setIsActive] = useState(false)

  useMotionValueEvent(active, 'change', (v) => {
    if (isPayoff) setIsActive(v > 0.85)
  })

  // Node 05 gets solid fill; 01–04 get a light tint
  const activeOverlayClass = isPayoff
    ? 'absolute inset-0 rounded-full border-2 border-brand bg-brand'
    : 'absolute inset-0 rounded-full border-2 border-brand bg-brand/10'

  return (
    <div className="relative flex h-10 w-10 items-center justify-center">
      {/* Inactive base */}
      <div className="absolute inset-0 rounded-full border-2 border-border bg-background-surface dark:border-white/12" />

      {/* Active fill — fades in as scroll reaches this node */}
      {shouldReduce ? (
        <div className={activeOverlayClass} />
      ) : (
        <motion.div style={{ opacity: active }} className={activeOverlayClass} />
      )}

      {/* Glow pulse ring — node 05 only, plays when fully active */}
      {isPayoff && isActive && !shouldReduce && (
        <motion.div
          animate={{ scale: [1, 1.28, 1], opacity: [0.45, 0.12, 0.45] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          className="absolute -inset-2 rounded-full bg-brand/30"
        />
      )}

      <span
        className={[
          'relative z-10 font-display text-[0.75rem] font-bold',
          isPayoff && isActive ? 'text-white' : 'text-foreground-light',
        ].join(' ')}
      >
        {step.num}
      </span>
    </div>
  )
}

export function HowItWorksSection() {
  const shouldReduce = useReducedMotion()
  const stepperRef = useRef<HTMLDivElement>(null)
  const lastNodeRef = useRef<HTMLDivElement>(null)

  // stepperHeight and railBottom together determine the exact rail span:
  // rail top = 20px (first node centre), rail bottom offset = railBottom px from stepper bottom
  // railHeight = stepperHeight - 20 - railBottom  →  spans exactly first→last node centre
  const [stepperHeight, setStepperHeight] = useState(0)
  const [railBottom, setRailBottom] = useState(20)
  const railHeight = Math.max(0, stepperHeight - 20 - railBottom)

  const { scrollYProgress } = useScroll({
    target: stepperRef,
    offset: ['start center', 'end center'],
  })

  // Orb: top = 14px at scroll=0 (first node centre − 6px half-orb),
  //       top = 14 + railHeight at scroll=1 (last node centre − 6px)
  const glowY = useTransform(scrollYProgress, [0, 1], [14, 14 + railHeight])

  useEffect(() => {
    const update = () => {
      const stepperEl = stepperRef.current
      const lastNodeEl = lastNodeRef.current
      if (!stepperEl || !lastNodeEl) return

      setStepperHeight(stepperEl.offsetHeight)

      // Distance from stepper bottom to last node centre
      const stepperBottom = stepperEl.getBoundingClientRect().bottom
      const lastRect = lastNodeEl.getBoundingClientRect()
      const lastCentre = lastRect.top + lastRect.height / 2
      setRailBottom(Math.max(0, Math.round(stepperBottom - lastCentre)))
    }

    update()
    const ro = new ResizeObserver(update)
    if (stepperRef.current) ro.observe(stepperRef.current)
    return () => ro.disconnect()
  }, [])

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
            Post Tracker connects to your campaign influencers, not random strangers who used your
            hashtag. Only the people you worked with.
          </p>
        </motion.div>

        {/* Stepper */}
        <div ref={stepperRef} className="relative mt-14 max-w-[660px]">

          {/* Rail track + fill — behind node circles, spans first→last node centre */}
          <div
            style={{ bottom: railBottom }}
            className="pointer-events-none absolute left-5 top-5 -z-10 w-px -translate-x-1/2"
          >
            <div className="absolute inset-0 bg-border/60 dark:bg-white/8" />
            {shouldReduce ? (
              <div className="absolute inset-0 bg-brand" />
            ) : (
              <motion.div
                style={{ scaleY: scrollYProgress }}
                className="absolute inset-0 origin-top bg-brand"
              />
            )}
          </div>

          {/* Glow orb — in front of circles, travels first→last node centre */}
          {!shouldReduce && railHeight > 0 && (
            <motion.div
              style={{
                y: glowY,
                x: '-50%',
                boxShadow:
                  '0 0 10px 4px hsl(var(--brand) / 0.55), 0 0 26px 10px hsl(var(--brand) / 0.22)',
              }}
              className="pointer-events-none absolute left-5 top-0 z-10 h-3 w-3 rounded-full bg-brand"
            />
          )}

          {/* Steps */}
          {steps.map((step, index) => {
            const isLast = index === steps.length - 1
            const threshold = index / (steps.length - 1)

            return (
              <div key={step.num} className="flex items-start gap-6">
                {/* Left: node */}
                <div
                  ref={isLast ? lastNodeRef : undefined}
                  className="flex w-10 flex-shrink-0 flex-col items-center"
                >
                  <StepNode
                    step={step}
                    scrollYProgress={scrollYProgress}
                    threshold={threshold}
                    shouldReduce={shouldReduce}
                    isPayoff={!!step.isPayoff}
                  />
                </div>

                {/* Right: content */}
                <motion.div
                  initial={shouldReduce ? {} : { opacity: 0, x: -14 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 0.48, ease: 'easeOut' }}
                  className={isLast ? 'w-full pb-0' : 'w-full pb-10'}
                >
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
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
