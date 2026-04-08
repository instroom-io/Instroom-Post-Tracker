'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useMarketingContact } from '@/components/marketing/marketing-contact-provider'

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export function CtaSection() {
  const { setOpen } = useMarketingContact()

  return (
    <section className="bg-brand-dark px-[5%] py-24 text-center">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
      >
        <motion.span
          variants={itemVariants}
          className="text-[0.73rem] font-bold uppercase tracking-[0.12em] text-white/45"
        >
          Get started today
        </motion.span>

        <motion.h2
          variants={itemVariants}
          className="mt-2 font-display text-[clamp(2rem,4vw,3rem)] font-bold leading-[1.1] tracking-tight text-white"
        >
          Your next campaign deserves
          <br />
          a system that actually works.
        </motion.h2>

        <motion.p
          variants={itemVariants}
          className="mx-auto mt-4 mb-9 max-w-[500px] text-[1rem] leading-[1.7] text-white/55"
        >
          Stop relying on manual checks, notification prayers, and chasing
          influencers for files. Set up Post Tracker in under 5 minutes and let
          automation handle the grunt work.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex flex-wrap justify-center gap-3"
        >
          <Link
            href="/request-access"
            className="rounded-[9px] bg-brand px-9 py-4 text-[1rem] font-semibold text-white transition-all hover:bg-brand/90 hover:shadow-[0_0_24px_rgba(31,174,91,0.5)]"
          >
            Start your free trial
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="rounded-[9px] border-[1.5px] border-white/20 px-9 py-4 text-[1rem] font-medium text-white/80 transition-all hover:bg-white/10"
          >
            Book a demo
          </button>
        </motion.div>

        <motion.p
          variants={itemVariants}
          className="mt-5 text-[0.8rem] text-white/30"
        >
          No credit card required · Works with your existing Google Drive ·
          Cancel anytime
        </motion.p>
      </motion.div>
    </section>
  )
}
