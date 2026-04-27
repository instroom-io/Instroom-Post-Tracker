'use client'

import { motion, useReducedMotion } from 'framer-motion'
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
  featured?: boolean
}

const features: FeatureCard[] = [
  {
    tag: 'Core differentiator',
    title: 'Influencer-specific monitoring',
    icon: UsersThree,
    description:
      "Unlike generic hashtag trackers that surface everyone who used your tag, Post Tracker monitors only the influencers you've hired. No irrelevant noise. No stranger content cluttering your library.",
    featured: true,
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

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: shouldReduce ? 0 : 0.08 } },
  }
  const itemVariants = {
    hidden: shouldReduce ? {} : { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  }

  const [heroFeature, ...restFeatures] = features

  return (
    <section className="bg-background-surface py-20" id="features">
      <div className="mx-auto max-w-[1060px] px-[5%]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {/* Section header */}
          <motion.div variants={itemVariants}>
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
              shouldn&apos;t pay for a full CRM just to solve a tracking
              problem.
            </p>
          </motion.div>

          {/* Hero feature card — full width, bg-brand-dark */}
          <motion.div
            variants={itemVariants}
            className="mt-12 mb-5 rounded-[14px] bg-brand-dark p-8 md:flex md:items-start md:gap-10"
          >
            <div className="mb-5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/12 md:mb-0">
              <heroFeature.icon size={24} weight="duotone" className="text-white" />
            </div>
            <div>
              <span className="mb-3 inline-block rounded-full bg-white/15 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-white/90">
                {heroFeature.tag}
              </span>
              <h3 className="mb-2 font-display text-[1.15rem] font-bold tracking-tight text-white">
                {heroFeature.title}
              </h3>
              <p className="text-[0.9rem] leading-relaxed text-white/70">
                {heroFeature.description}
              </p>
            </div>
          </motion.div>

          {/* Remaining 5 — 2-col grid with icons */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {restFeatures.map((feature) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  variants={itemVariants}
                  className="rounded-[14px] border border-border bg-background p-7 transition-colors hover:border-border-strong dark:border-white/8 dark:bg-white/5 dark:hover:border-white/15"
                >
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 dark:bg-brand/12">
                    <Icon size={18} weight="duotone" className="text-brand" />
                  </div>
                  <span className="mb-3 inline-block rounded-full bg-brand/10 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-brand-dark dark:text-brand">
                    {feature.tag}
                  </span>
                  <h3 className="mb-2 font-display text-[1rem] font-bold tracking-tight text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-[0.875rem] leading-relaxed text-foreground-lighter">
                    {feature.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
