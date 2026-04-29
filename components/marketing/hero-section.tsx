'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { HeroBackground } from '@/components/marketing/hero-background'
import { DashboardMockup } from '@/components/marketing/dashboard-mockup'
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
      initial: { opacity: 0, y: 18 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] as const },
    }
  }

  return (
    <section className="relative overflow-hidden" id="hero" style={{ minHeight: '100svh' }}>
      <HeroBackground />

      <div
        className="relative z-10 mx-auto flex w-full max-w-[1180px] items-center px-[5%] pt-16"
        style={{ minHeight: '100svh' }}
      >
        <div className="grid w-full grid-cols-1 items-center gap-10 py-28 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:py-0">

          {/* ── Left: copy ───────────────────────────────────────── */}
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">

            <motion.div
              {...fadeIn(0)}
              className="mb-5 text-[0.68rem] font-semibold uppercase tracking-widest text-brand"
            >
              Instroom Post Tracker
            </motion.div>

            <motion.h1
              {...fadeIn(0.06)}
              className="mb-5 font-display text-[clamp(2.1rem,4.2vw,3.6rem)] font-bold leading-[1.07] tracking-tight text-foreground"
            >
              Stop hunting for influencer posts.{' '}
              <span className="text-brand">Let the system do it.</span>
            </motion.h1>

            <motion.p
              {...fadeIn(0.12)}
              className="mb-9 max-w-[500px] text-[1.05rem] leading-[1.75] text-foreground-light"
            >
              Add your influencers. We detect every post, download the content, and file it to your Google Drive by campaign. You review. We handle the rest.
            </motion.p>

            <motion.div {...fadeIn(0.18)} className="mb-5 flex flex-wrap justify-center gap-3 lg:justify-start">
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

            <motion.p {...fadeIn(0.22)} className="mb-7 text-[0.78rem] text-foreground-light">
              No credit card required · Cancel anytime · Setup in under 5 minutes
            </motion.p>

            <motion.div {...fadeIn(0.26)} className="flex flex-wrap justify-center gap-2 lg:justify-start">
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

          {/* ── Right: mockup composition ────────────────────────── */}
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-center lg:justify-end"
          >
            {/* Scale down on smaller screens, full size on xl */}
            <div className="origin-center scale-[0.68] sm:scale-[0.80] md:scale-[0.88] lg:scale-90 xl:scale-100">
              <DashboardMockup />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
