'use client'

import { motion } from 'framer-motion'
import { X, Check } from '@phosphor-icons/react'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const oldWayItems = [
  'Manually searching Instagram, TikTok, and YouTube for influencer posts. Still missing half of them.',
  'Downloading watermarked content through screen recording or third-party tools',
  'Building spreadsheets to track which posts went live and when',
  'No way to enforce usage rights before content gets repurposed',
  'Compiling performance reports weeks after campaigns end, with inconsistent data',
]

const newWayItems = [
  'Every post detected the moment it goes live, across all three platforms',
  'Watermark-free content downloaded directly to your Google Drive',
  'Real-time campaign dashboard with every post logged and categorized',
  'Usage rights gating: content only downloads when rights are confirmed',
  'Frozen 7-day metrics with automatic EMV calculation for every post',
]

export function ProblemSection() {
  return (
    <section id="problem" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="font-display text-3xl lg:text-5xl font-bold text-foreground">The old way is broken</h2>
            <p className="text-foreground-lighter text-lg mt-4 max-w-2xl mx-auto">
              Agencies waste hours every week on manual post tracking, watermarked downloads, and scattered spreadsheets.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="marketing-card grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-0 overflow-hidden">
            <div className="p-8 lg:p-10 border-b md:border-b-0 md:border-r border-destructive/10">
              <h3 className="font-display text-lg font-bold text-destructive mb-6">Without Instroom</h3>
              <ul className="space-y-4">
                {oldWayItems.map((text) => (
                  <li key={text} className="flex items-start gap-3">
                    <X size={16} className="text-destructive mt-0.5 shrink-0" />
                    <span className="text-foreground-light text-sm">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-8 lg:p-10">
              <h3 className="font-display text-lg font-bold text-brand mb-6">With Instroom</h3>
              <ul className="space-y-4">
                {newWayItems.map((text) => (
                  <li key={text} className="flex items-start gap-3">
                    <Check size={16} className="text-brand mt-0.5 shrink-0" />
                    <span className="text-foreground-light text-sm">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
