'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { HeroBackground } from '@/components/marketing/hero-background'
import { PlatformLogo } from '@/components/ui/platform-icon'

function smoothScroll(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  const href = e.currentTarget.getAttribute('href')
  if (href) document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
}

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion()

  function fadeIn(delay: number) {
    if (prefersReducedMotion) return {}
    return {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
    }
  }

  return (
    <section
      className="relative overflow-hidden"
      id="hero"
      style={{ minHeight: '100svh' }}
    >
      <HeroBackground />

      <div
        className="relative z-10 flex flex-col items-center justify-center px-5 pt-24 pb-16 text-center"
        style={{ minHeight: '100svh' }}
      >
        {/* Eyebrow */}
        <motion.div
          {...fadeIn(0)}
          className="mb-6 text-[0.68rem] font-semibold uppercase tracking-widest text-brand"
        >
          Instroom Post Tracker
        </motion.div>

        {/* H1 */}
        <motion.h1
          {...fadeIn(0.06)}
          className="mb-5 max-w-[860px] font-display text-[clamp(2.4rem,6vw,4.5rem)] font-bold leading-[1.06] tracking-tight text-foreground"
        >
          Stop hunting for influencer posts.{' '}
          <span className="text-brand">Let the system do it.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          {...fadeIn(0.12)}
          className="mb-10 max-w-[580px] text-[1.05rem] leading-[1.75] text-foreground-light"
        >
          Add your influencers. We detect every post, download the content, and file it to your Google Drive by campaign. You review. We handle the rest.
        </motion.p>

        {/* CTAs */}
        <motion.div {...fadeIn(0.18)} className="mb-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-[9px] bg-brand px-8 py-3.5 text-[0.95rem] font-semibold text-[#07130b] transition-shadow duration-200 hover:shadow-[0_0_28px_rgba(31,174,91,0.45)]"
          >
            Start tracking for free
          </Link>
          <a
            href="#how-it-works"
            onClick={smoothScroll}
            className="rounded-[9px] border border-foreground/20 px-8 py-3.5 text-[0.95rem] font-medium text-foreground transition-colors duration-200 hover:border-foreground/40 hover:bg-foreground/5"
          >
            See how it works →
          </a>
        </motion.div>

        {/* Proof line */}
        <motion.p
          {...fadeIn(0.22)}
          className="mb-8 text-[0.78rem] text-foreground-light"
        >
          No credit card required · Cancel anytime · Setup in under 5 minutes
        </motion.p>

        {/* Platform pills */}
        <motion.div {...fadeIn(0.26)} className="flex flex-wrap justify-center gap-2">
          {(['instagram', 'tiktok', 'youtube'] as const).map((platform) => (
            <span
              key={platform}
              className="rounded-md border border-border px-3 py-1 text-[0.78rem] font-medium text-foreground-lighter"
            >
              <PlatformLogo platform={platform} size={11} />
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
