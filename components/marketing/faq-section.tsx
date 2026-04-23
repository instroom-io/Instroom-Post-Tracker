'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { CaretDown } from '@phosphor-icons/react'

const faqs = [
  {
    question: "Does it track random people who use my hashtag?",
    answer:
      "No. That's the entire point. Post Tracker only monitors influencers you've added to your campaign. You get signal, not noise.",
  },
  {
    question: 'How does automatic content download work?',
    answer:
      "When an influencer has been marked as having granted usage rights, Post Tracker automatically downloads their posts and saves them to your designated Google Drive folder. Nothing manual.",
  },
  {
    question: 'Is this a separate product from Instroom CRM?',
    answer:
      "Yes. Post Tracker is a standalone SaaS. You only pay for what you use. It can also be bundled into your Instroom CRM plan at a discounted rate if you want both.",
  },
  {
    question: 'Which platforms are supported?',
    answer:
      'Instagram, TikTok, and YouTube. Post Tracker monitors both hashtag usage and direct brand mentions across all three platforms simultaneously.',
  },
  {
    question: "Can agencies manage client brands without a separate subscription?",
    answer:
      "Yes. If a brand already has a Post Tracker subscription, they can approve your access request. You manage their account from your own login. No separate payment, no account switching.",
  },
  {
    question: "What if an influencer didn't grant usage rights?",
    answer:
      'Post Tracker still detects and logs the post in your dashboard. Content download is only triggered for influencers where usage rights have been confirmed in your campaign settings.',
  },
]

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  function toggle(index: number) {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section id="faq" className="bg-background-surface py-20">
      <div className="mx-auto max-w-[1060px] px-[5%]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="mb-10"
        >
          <span className="text-[0.73rem] font-bold uppercase tracking-[0.12em] text-brand">
            FAQ
          </span>
          <h2 className="mt-2 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.15] tracking-tight text-foreground">
            Common questions,
            <br />
            straight answers.
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="mx-auto max-w-[760px] divide-y divide-border rounded-xl border border-border bg-background dark:border-white/8 dark:bg-white/5"
        >
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index
            return (
              <div key={faq.question}>
                <button
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-display text-[0.95rem] font-bold text-foreground">
                    {faq.question}
                  </span>
                  <CaretDown
                    size={16}
                    weight="bold"
                    className={`shrink-0 text-foreground-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}
                >
                  <p className="px-6 pb-5 text-[0.875rem] leading-relaxed text-foreground-lighter">
                    {faq.answer}
                  </p>
                </div>
              </div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
