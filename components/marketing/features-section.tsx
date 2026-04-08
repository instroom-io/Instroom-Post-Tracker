'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

interface FeatureCard {
  tag: string
  title: string
  description: string
  featured?: boolean
}

const features: FeatureCard[] = [
  {
    tag: 'Core differentiator',
    title: 'Influencer-specific monitoring',
    description:
      "Unlike generic hashtag trackers that surface everyone who used your tag, Post Tracker monitors only the influencers you've hired. No irrelevant noise. No stranger content cluttering your library.",
    featured: true,
  },
  {
    tag: 'Automation',
    title: 'Automatic content download',
    description:
      'When usage rights are confirmed, content is automatically pulled from Instagram, TikTok, and YouTube — no watermarks, no manual saves, no chasing.',
  },
  {
    tag: 'Organization',
    title: 'Structured Google Drive sync',
    description:
      'Every piece of content is automatically organized in your Google Drive by influencer, platform, and campaign. Your team always knows exactly where to find it.',
  },
  {
    tag: 'Monitoring',
    title: 'Hashtag + mention tracking',
    description:
      'Track branded hashtags and account mentions across Instagram, TikTok, and YouTube simultaneously. Post Tracker catches everything your influencers publish under your campaign.',
  },
  {
    tag: 'Repurposing',
    title: 'Paid ads–ready UGC library',
    description:
      'Every approved asset builds your creative library automatically. Hand it directly to your media buyer or ads team — no friction, no manual transfer, no delays.',
  },
  {
    tag: 'Multi-client',
    title: 'Built for agencies and freelancers',
    description:
      "Purchase your own plan or request access to a brand's existing account. Once approved, all your brands live under one login — no juggling separate accounts, no extra payment if the brand is already subscribed.",
  },
]

export function FeaturesSection() {
  return (
    <section className="bg-background-surface py-20" id="features">
      <div className="mx-auto max-w-[1060px] px-[5%]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
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

          <div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className={cn(
                  'rounded-[14px] p-7 transition-colors',
                  feature.featured
                    ? 'bg-brand-dark'
                    : 'border border-border bg-background hover:border-border-strong dark:border-white/8 dark:bg-white/5 dark:hover:border-white/15'
                )}
              >
                <span
                  className={cn(
                    'mb-4 inline-block rounded-full px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-[0.1em]',
                    feature.featured
                      ? 'bg-white/15 text-white/90'
                      : 'bg-brand/12 text-brand-dark dark:text-brand'
                  )}
                >
                  {feature.tag}
                </span>
                <h3
                  className={cn(
                    'mb-2 font-display text-[1.05rem] font-bold tracking-tight',
                    feature.featured ? 'text-white' : 'text-foreground'
                  )}
                >
                  {feature.title}
                </h3>
                <p
                  className={cn(
                    'text-[0.875rem] leading-relaxed',
                    feature.featured ? 'text-white/70' : 'text-foreground-lighter'
                  )}
                >
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
