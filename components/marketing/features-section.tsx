'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import {
  UsersThree,
  DownloadSimple,
  FolderOpen,
  HashStraight,
  Images,
  Briefcase,
} from '@phosphor-icons/react'

interface FeatureCard {
  tag: string
  title: string
  icon: React.ElementType
  description: string
}

const features: FeatureCard[] = [
  {
    tag: 'Core differentiator',
    title: 'Influencer-specific monitoring',
    icon: UsersThree,
    description:
      "Unlike generic hashtag trackers that surface everyone who used your tag, Post Tracker monitors only the influencers you've hired. No irrelevant noise. No stranger content cluttering your library.",
  },
  {
    tag: 'Automation',
    title: 'Automatic content download',
    icon: DownloadSimple,
    description:
      'When usage rights are confirmed, content is automatically pulled from Instagram, TikTok, and YouTube. No watermarks, no manual saves.',
  },
  {
    tag: 'Organization',
    title: 'Structured Google Drive sync',
    icon: FolderOpen,
    description:
      'Every piece of content is automatically organized in your Google Drive by influencer, platform, and campaign. Your team always knows exactly where to find it.',
  },
  {
    tag: 'Monitoring',
    title: 'Hashtag + mention tracking',
    icon: HashStraight,
    description:
      'Track branded hashtags and account mentions across Instagram, TikTok, and YouTube simultaneously. Post Tracker catches everything your influencers publish under your campaign.',
  },
  {
    tag: 'Repurposing',
    title: 'Paid ads–ready UGC library',
    icon: Images,
    description:
      "Every approved asset builds your creative library automatically. Hand it straight to your media buyer or ads team. It's already organized and ready.",
  },
  {
    tag: 'Multi-client',
    title: 'Built for agencies and freelancers',
    icon: Briefcase,
    description:
      "Purchase your own plan or request access to a brand's existing account. Once approved, all your brands live under one login. No account juggling. If the brand is already subscribed, you join at no extra cost.",
  },
]

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

        {/* 3×2 grid — all 6 features, equal hierarchy */}
        <div
          ref={ref}
          className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={shouldReduce ? {} : { opacity: 0, y: 24 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                transition={{
                  duration: 0.5,
                  delay: shouldReduce ? 0 : index * 0.07,
                  ease: 'easeOut',
                }}
                className="flex flex-col rounded-[14px] border border-border bg-background p-7 transition-shadow hover:border-border-strong hover:shadow-md dark:border-white/8 dark:bg-white/5 dark:hover:border-white/15"
              >
                {/* Icon + number */}
                <div className="mb-5 flex items-start justify-between">
                  <Icon size={22} weight="duotone" className="text-brand" />
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
          })}
        </div>
      </div>
    </section>
  )
}
