'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CaretDown } from '@phosphor-icons/react'

const faqs = [
  {
    question: 'How does post detection work?',
    answer: 'Instroom continuously monitors Instagram, TikTok, and YouTube for posts from your tracked influencers. When a new post is detected, it\'s automatically matched to the correct campaign based on the influencer\'s assignment and logged in your dashboard — typically within minutes of going live.',
  },
  {
    question: 'What platforms are supported?',
    answer: 'We currently support Instagram (posts, reels, stories), TikTok (videos), and YouTube (videos, shorts). Each platform is monitored independently with dedicated detection pipelines.',
  },
  {
    question: 'Where does content get stored?',
    answer: 'All downloaded content is stored in your connected Google Drive, organized by brand workspace and campaign. Each workspace has its own folder structure, making it easy to share specific campaign content with clients.',
  },
  {
    question: 'What happens if usage rights aren\'t enabled?',
    answer: 'Content is detected and logged regardless of usage rights status. However, the actual file download to Google Drive is gated — it only happens when usage rights are toggled on for that specific influencer in that campaign. This protects your agency from unauthorized content use.',
  },
  {
    question: 'How is EMV calculated?',
    answer: 'Estimated Media Value is calculated per post using configurable CPM (Cost Per Mille) rates that you set per platform. The formula uses the post\'s actual impressions multiplied by your CPM rate, giving you a consistent, defensible number for client reporting.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'We offer a guided demo and pilot period for qualified agencies. Contact our team to discuss your needs and we\'ll set up a trial workspace with your actual campaign data.',
  },
]

const containerVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }
const itemVariants = { hidden: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="marketing-card rounded-[16px] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left"
        aria-expanded={isOpen}
      >
        <span className="font-display text-sm font-semibold text-foreground pr-4">{question}</span>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <CaretDown size={16} className="text-foreground-muted shrink-0" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-0">
              <p className="text-foreground-lighter text-sm leading-relaxed">{answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function FaqSection() {
  return (
    <section id="faq" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-3xl px-6">
        <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }}>
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="font-display text-3xl lg:text-5xl font-bold text-foreground">Common questions</h2>
          </motion.div>

          <div className="space-y-4">
            {faqs.map(faq => (
              <motion.div key={faq.question} variants={itemVariants}>
                <FaqItem question={faq.question} answer={faq.answer} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
