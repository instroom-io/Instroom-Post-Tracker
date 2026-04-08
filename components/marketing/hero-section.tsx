'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

function smoothScroll(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault()
  const href = e.currentTarget.getAttribute('href')
  if (href) document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-28 pb-20" id="hero">
      {/* Dark mode radial green glow */}
      <div
        className="pointer-events-none absolute inset-0 hidden dark:block"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(31,174,91,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-[860px] px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          {/* Badge */}
          <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-brand/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-brand-dark dark:text-brand">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
            Built by marketers, for marketers
          </div>

          {/* H1 */}
          <h1 className="mb-5 font-display text-[clamp(2.4rem,5.5vw,3.75rem)] font-bold leading-[1.08] tracking-tight text-foreground">
            Stop hunting for influencer posts.{' '}
            <span className="text-brand">Let the system do it.</span>
          </h1>

          {/* Subheadline — SEO keyword injected */}
          <p className="mx-auto mb-9 max-w-[580px] text-[1.1rem] leading-[1.7] text-foreground-lighter">
            The influencer post tracking tool that monitors hashtags, downloads
            content to Google Drive, and organizes your UGC library —
            automatically.
          </p>

          {/* CTAs */}
          <div className="mb-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/request-access"
              className="rounded-[9px] bg-brand px-8 py-3.5 text-[0.95rem] font-semibold text-white transition-all hover:bg-brand/90 dark:hover:shadow-[0_0_24px_rgba(31,174,91,0.4)]"
            >
              Start tracking for free
            </Link>
            <a
              href="#how-it-works"
              onClick={smoothScroll}
              className="rounded-[9px] border border-border px-8 py-3.5 text-[0.95rem] font-medium text-foreground transition-all hover:border-border-strong hover:bg-background-muted dark:border-white/15 dark:text-foreground-light dark:hover:bg-white/5"
            >
              See how it works →
            </a>
          </div>

          {/* Proof line */}
          <p className="mb-6 text-[0.8rem] text-foreground-muted">
            No credit card required · Cancel anytime · Setup in under 5 minutes
          </p>

          {/* Platform pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {['Instagram', 'TikTok', 'YouTube'].map((p) => (
              <span
                key={p}
                className="rounded-md border border-border bg-background-surface px-3 py-1 text-[0.78rem] font-medium text-foreground-lighter dark:border-white/10 dark:bg-white/5"
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
