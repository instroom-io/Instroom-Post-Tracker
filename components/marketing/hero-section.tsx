'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { HeroVideo } from '@/components/marketing/hero-video'

function smoothScroll(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  const href = e.currentTarget.getAttribute('href')
  if (href) document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
}

export function HeroSection() {
  return (
    <section
      className="relative overflow-hidden"
      id="hero"
      style={{ minHeight: '100svh' }}
    >
      {/* Full-bleed background video + overlays + glow border */}
      <HeroVideo />

      {/* Center-aligned content */}
      <div
        className="relative z-10 flex flex-col items-center justify-center px-5 pt-24 pb-12 text-center"
        style={{ minHeight: '100svh' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          {/* Eyebrow */}
          <div
            className="mb-6 text-[0.68rem] font-semibold uppercase tracking-widest"
            style={{ color: '#1aff6e' }}
          >
            Built by marketers, for marketers
          </div>

          {/* H1 */}
          <h1
            className="mb-5 max-w-[860px] font-display text-[clamp(2.4rem,6vw,4.5rem)] font-bold leading-[1.06] tracking-tight text-white"
            style={{ textShadow: '0 2px 28px rgba(0,0,0,0.55)' }}
          >
            Stop hunting for influencer posts.{' '}
            <span style={{ color: '#1aff6e' }}>
              Let the system do it.
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="mb-10 max-w-[600px] text-[1.05rem] leading-[1.75]"
            style={{ color: 'rgba(255,255,255,0.68)' }}
          >
            Instroom Post Tracker tracks every hashtag, mention, and post from your campaign influencers. Content gets downloaded and filed in Google Drive automatically. You focus on strategy. It handles the rest.
          </p>

          {/* CTAs */}
          <div className="mb-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="rounded-[9px] px-8 py-3.5 text-[0.95rem] font-semibold transition-all hover:opacity-90"
              style={{
                background: '#1aff6e',
                color: '#07130b',
                boxShadow: '0 0 0 rgba(26,255,110,0)',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.boxShadow =
                  '0 0 28px rgba(26,255,110,0.45)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.boxShadow =
                  '0 0 0 rgba(26,255,110,0)'
              }}
            >
              Start tracking for free
            </Link>
            <a
              href="#how-it-works"
              onClick={smoothScroll}
              className="rounded-[9px] border px-8 py-3.5 text-[0.95rem] font-medium text-white transition-all"
              style={{ borderColor: 'rgba(255,255,255,0.28)' }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(255,255,255,0.55)'
                el.style.background = 'rgba(255,255,255,0.08)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'rgba(255,255,255,0.28)'
                el.style.background = ''
              }}
            >
              See how it works →
            </a>
          </div>

          {/* Proof line */}
          <p
            className="mb-8 text-[0.78rem]"
            style={{ color: 'rgba(255,255,255,0.42)' }}
          >
            No credit card required · Cancel anytime · Setup in under 5 minutes
          </p>

          {/* Platform pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {['Instagram', 'TikTok', 'YouTube'].map((p) => (
              <span
                key={p}
                className="rounded-md px-3 py-1 text-[0.78rem] font-medium"
                style={{
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.58)',
                }}
              >
                {p}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
