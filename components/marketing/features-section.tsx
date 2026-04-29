'use client'

import { useRef, useEffect } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'

import usersAnim     from '@/public/icons/feature-users.json'
import downloadAnim  from '@/public/icons/feature-download.json'
import folderAnim    from '@/public/icons/feature-folder.json'
import hashtagAnim   from '@/public/icons/feature-hashtag.json'
import galleryAnim   from '@/public/icons/feature-gallery.json'
import briefcaseAnim from '@/public/icons/feature-briefcase.json'

interface FeatureCard {
  tag: string
  title: string
  animationData: object
  description: string
}

const features: FeatureCard[] = [
  {
    tag: 'Core differentiator',
    title: 'Influencer-specific monitoring',
    animationData: usersAnim,
    description:
      "Unlike generic hashtag trackers that surface everyone who used your tag, Post Tracker monitors only the influencers you've hired. No irrelevant noise. No stranger content cluttering your library.",
  },
  {
    tag: 'Automation',
    title: 'Automatic content download',
    animationData: downloadAnim,
    description:
      'When usage rights are confirmed, content is automatically pulled from Instagram, TikTok, and YouTube. No watermarks, no manual saves.',
  },
  {
    tag: 'Organization',
    title: 'Structured Google Drive sync',
    animationData: folderAnim,
    description:
      'Every piece of content is automatically organized in your Google Drive by influencer, platform, and campaign. Your team always knows exactly where to find it.',
  },
  {
    tag: 'Monitoring',
    title: 'Hashtag + mention tracking',
    animationData: hashtagAnim,
    description:
      'Track branded hashtags and account mentions across Instagram, TikTok, and YouTube simultaneously. Post Tracker catches everything your influencers publish under your campaign.',
  },
  {
    tag: 'Repurposing',
    title: 'Paid ads–ready UGC library',
    animationData: galleryAnim,
    description:
      "Every approved asset builds your creative library automatically. Hand it straight to your media buyer or ads team. It's already organized and ready.",
  },
  {
    tag: 'Multi-client',
    title: 'Built for agencies and freelancers',
    animationData: briefcaseAnim,
    description:
      "Purchase your own plan or request access to a brand's existing account. Once approved, all your brands live under one login. No account juggling. If the brand is already subscribed, you join at no extra cost.",
  },
]

function FeatureCardItem({
  feature,
  index,
  shouldReduce,
  isInView,
}: {
  feature: FeatureCard
  index: number
  shouldReduce: boolean | null
  isInView: boolean
}) {
  const lottieRef = useRef<LottieRefCurrentProps>(null)

  useEffect(() => {
    if (!isInView || shouldReduce) return
    const timer = setTimeout(() => {
      lottieRef.current?.goToAndPlay(0, true)
    }, index * 80)
    return () => clearTimeout(timer)
  }, [isInView, index, shouldReduce])

  return (
    <motion.div
      initial={shouldReduce ? {} : { opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{
        duration: 0.5,
        delay: shouldReduce ? 0 : index * 0.07,
        ease: 'easeOut',
      }}
      onMouseEnter={() => lottieRef.current?.goToAndPlay(0, true)}
      onMouseLeave={() => lottieRef.current?.stop()}
      className="flex flex-col rounded-[14px] border border-border bg-background p-7 transition-shadow hover:border-border-strong hover:shadow-md dark:border-white/8 dark:bg-white/5 dark:hover:border-white/15"
    >
      {/* Icon + number */}
      <div className="mb-5 flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand">
          <div className="brightness-0 invert">
            <Lottie
              lottieRef={lottieRef}
              animationData={feature.animationData}
              loop={false}
              autoplay={false}
              style={{ width: 22, height: 22 }}
            />
          </div>
        </div>
        <span className="font-display text-[0.7rem] font-bold tabular-nums text-foreground-muted">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>

      {/* Category label */}
      <span className="mb-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-foreground-muted">
        {feature.tag}
      </span>

      {/* Heading */}
      <h3 className="mb-2 font-display text-[1rem] font-bold leading-snug tracking-tight text-foreground">
        {feature.title}
      </h3>

      {/* Description */}
      <p className="text-[0.84rem] leading-relaxed text-foreground-lighter">
        {feature.description}
      </p>
    </motion.div>
  )
}

export function FeaturesSection() {
  const shouldReduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, amount: 0.1 })

  return (
    <section className="bg-background-surface py-20" id="features">
      <div className="mx-auto max-w-[1060px] px-[5%]">
        {/* Section header */}
        <motion.div
          initial={shouldReduce ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <span className="text-[0.73rem] font-bold uppercase tracking-[0.12em] text-brand">
            Features
          </span>
          <h2 className="mt-2 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.15] tracking-tight text-foreground">
            Everything you need.
            <br />
            Nothing you don&apos;t.
          </h2>
          <p className="mt-3 max-w-[560px] text-[1rem] leading-[1.7] text-foreground-lighter">
            We built Post Tracker as a standalone tool because you
            shouldn&apos;t pay for a full CRM just to solve a tracking problem.
          </p>
        </motion.div>

        {/* 3×2 grid */}
        <div
          ref={ref}
          className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, index) => (
            <FeatureCardItem
              key={feature.title}
              feature={feature}
              index={index}
              shouldReduce={shouldReduce}
              isInView={isInView}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
