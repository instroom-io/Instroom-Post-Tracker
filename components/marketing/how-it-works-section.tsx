'use client'

import { motion } from 'framer-motion'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const steps: { title: string; description: string }[] = [
  {
    title: 'Campaign Setup',
    description:
      'Create a campaign, add your influencers with their social handles, and configure tracking. Instroom starts monitoring immediately.',
  },
  {
    title: 'Post Detection',
    description:
      'Our system scans Instagram, TikTok, and YouTube continuously. When an influencer posts, it\'s detected, matched, and logged within minutes.',
  },
  {
    title: 'Rights & Download',
    description:
      'Toggle usage rights per influencer. Once enabled, content is downloaded watermark-free to your Google Drive — organized by brand and campaign.',
  },
  {
    title: 'Metrics & EMV',
    description:
      'Seven days after publish, performance metrics are captured and frozen. EMV is calculated automatically using your configured CPM rates.',
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="font-display text-3xl lg:text-5xl font-bold text-white">
              From post live to performance report — without lifting a finger
            </h2>
            <p className="text-white/50 text-lg mt-4 max-w-2xl mx-auto">
              Four steps. Fully automated. Your team focuses on strategy while Instroom handles the rest.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                variants={itemVariants}
                className="relative"
              >
                <span className="absolute -top-6 left-2 text-[100px] lg:text-[120px] font-display font-black text-brand/5 leading-none select-none pointer-events-none">
                  {i + 1}
                </span>

                <div className="relative bg-white/5 backdrop-blur-xl border border-brand/20 rounded-[20px] p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <div className="bg-brand/10 rounded-full w-8 h-8 flex items-center justify-center mb-4">
                    <span className="text-brand font-bold text-sm">{i + 1}</span>
                  </div>
                  <h3 className="font-display text-base font-bold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {i < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 border-t border-dashed border-brand/30" />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
