'use client'

import { motion } from 'framer-motion'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
}

const faqs = [
  {
    question: "Does it track random people who use my hashtag?",
    answer:
      "No — and that's the entire point. Post Tracker only monitors influencers you've added to your campaign. You get signal, not noise.",
  },
  {
    question: 'How does automatic content download work?',
    answer:
      "When an influencer has been marked as having granted usage rights, Post Tracker automatically downloads their posts and saves them to your designated Google Drive folder — no manual steps required.",
  },
  {
    question: 'Is this a separate product from Instroom CRM?',
    answer:
      "Yes. Post Tracker is a standalone SaaS — you don't pay for features you don't use. It can also be bundled into your Instroom CRM plan at a discounted rate if you want both.",
  },
  {
    question: 'Which platforms are supported?',
    answer:
      'Instagram, TikTok, and YouTube. Post Tracker monitors both hashtag usage and direct brand mentions across all three platforms simultaneously.',
  },
  {
    question: "Can agencies manage client brands without a separate subscription?",
    answer:
      "Yes. If a brand already has a Post Tracker subscription, they can approve your access request. You manage their account from your own login — no separate payment, no switching accounts, no friction.",
  },
  {
    question: "What if an influencer didn't grant usage rights?",
    answer:
      'Post Tracker still detects and logs the post in your dashboard. Content download is only triggered for influencers where usage rights have been confirmed in your campaign settings.',
  },
]

export function FaqSection() {
  return (
    <section id="faq" className="bg-background-surface py-20">
      <div className="mx-auto max-w-[1060px] px-[5%]">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div variants={itemVariants} className="mb-10">
            <span className="text-[0.73rem] font-bold uppercase tracking-[0.12em] text-brand">
              FAQ
            </span>
            <h2 className="mt-2 font-display text-[clamp(1.75rem,3.2vw,2.5rem)] font-bold leading-[1.15] tracking-tight text-foreground">
              Common questions,
              <br />
              straight answers.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {faqs.map((faq) => (
              <motion.div
                key={faq.question}
                variants={itemVariants}
                className="rounded-xl border border-border bg-background p-5 dark:border-white/8 dark:bg-white/5"
              >
                <h4 className="mb-2 font-display text-[0.9rem] font-bold text-foreground">
                  {faq.question}
                </h4>
                <p className="text-[0.84rem] leading-relaxed text-foreground-lighter">
                  {faq.answer}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
