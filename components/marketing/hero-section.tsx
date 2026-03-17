'use client'

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { HeroVideo } from '@/components/marketing/hero-video'
import { useMarketingContact } from '@/components/marketing/marketing-contact-provider'

function smoothScroll(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  const href = e.currentTarget.getAttribute('href')
  if (href) document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
}

export function HeroSection() {
  const { setOpen } = useMarketingContact()

  return (
    <section className="relative min-h-screen overflow-hidden" id="hero">
      {/* Background layers */}
      <HeroVideo />

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(15,107,62,0.3)_0%,_transparent_70%)]" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          {/* Eyebrow */}
          <span className="inline-block text-brand text-xs font-semibold tracking-[0.2em] uppercase mb-6">
            Influencer Marketing Infrastructure
          </span>

          {/* H1 */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-[1.1]">
            Every post.{' '}Tracked.{' '}Downloaded.{' '}
            <span className="relative">
              Measured.
              <span className="absolute bottom-0 left-0 w-full h-[3px] bg-brand rounded-full" />
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-white/50 text-lg lg:text-xl max-w-xl leading-relaxed mt-6">
            Instroom gives influencer marketing agencies total control over every
            campaign post — from detection to download to performance measurement.
            No spreadsheets. No manual tracking. No missing content.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 mt-8">
            <button
              onClick={() => setOpen(true)}
              className="bg-brand text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-brand/90 hover:shadow-[0_0_30px_rgba(31,174,91,0.4)] transition-all"
            >
              Contact Us
            </button>
            <a
              href="#how-it-works"
              onClick={smoothScroll}
              className="border border-brand/40 text-brand px-6 py-3 rounded-lg text-sm font-semibold hover:bg-brand/10 transition-all"
            >
              See How It Works
            </a>
          </div>

          {/* Trust row */}
          <div className="flex flex-wrap gap-6 mt-8 text-white/40 text-xs">
            <span>&#10003; HMAC-secured webhooks</span>
            <span>&#10003; Google Drive integrated</span>
            <span>&#10003; Multi-brand workspaces</span>
          </div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <ChevronDown size={20} className="text-white/30" />
      </motion.div>
    </section>
  )
}
