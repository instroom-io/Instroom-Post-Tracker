'use client'

import { motion } from 'framer-motion'
import {
  Radar,
  Shield,
  CloudDownload,
  Lock,
  Sparkles,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const features: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Radar,
    title: 'Automatic Post Detection',
    description:
      'Every influencer post across Instagram, TikTok, and YouTube is detected the moment it goes live. Matched to the right campaign automatically.',
  },
  {
    icon: Shield,
    title: 'Usage Rights Gating',
    description:
      'Content downloads are gated behind a per-influencer, per-campaign usage rights toggle. No rights, no download — protecting your agency and your clients.',
  },
  {
    icon: CloudDownload,
    title: 'Watermark-Free Downloads',
    description:
      'Original-quality content downloaded directly to a structured Google Drive folder. No screen recording. No watermarks. No manual work.',
  },
  {
    icon: Lock,
    title: 'Frozen Performance Metrics',
    description:
      'Engagement data captured exactly 7 days after publish — then locked forever. Honest metrics that can\'t be inflated or cherry-picked.',
  },
  {
    icon: Sparkles,
    title: 'EMV Calculation',
    description:
      'Estimated Media Value calculated per post using configurable CPM rates per platform. One clean number for every client report.',
  },
  {
    icon: LayoutGrid,
    title: 'Multi-Brand Workspaces',
    description:
      'One workspace per brand client. The agency sees everything. Each brand sees only their own world. Clean multi-tenant hierarchy.',
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="font-display text-3xl lg:text-5xl font-bold text-foreground">
              Everything your agency needs to run influencer at scale
            </h2>
            <p className="text-foreground-lighter text-lg mt-4 max-w-2xl mx-auto">
              Six core capabilities that replace your spreadsheets, manual downloads, and guesswork.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className="marketing-card marketing-card-hover p-6"
              >
                <div className="bg-brand-muted rounded-xl p-3 w-12 h-12 flex items-center justify-center mb-4">
                  <feature.icon size={22} className="text-brand" />
                </div>
                <h3 className="font-display text-base font-bold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-foreground-lighter text-sm leading-relaxed">
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
