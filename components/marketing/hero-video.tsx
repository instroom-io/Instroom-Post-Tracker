'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef, useEffect } from 'react'
import { useTheme } from 'next-themes'

export function HeroVideo() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const ref = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '15%'])
  const opacity = useTransform(scrollYProgress, [0, 0.65], [1, 0])

  // Explicit play on mount — autoPlay alone is unreliable in React/Next.js hydration
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.play().catch(() => {})
  }, [])

  return (
    <>
      <style>{`
        @keyframes glow-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        .hero-glow-sweep {
          animation: glow-sweep 2.8s linear infinite;
        }
      `}</style>

      <motion.div
        ref={ref}
        className="absolute inset-0 pointer-events-none z-0"
        style={{ y, opacity }}
      >
        {/* Video — full-bleed, all viewports */}
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/marketing/PostTrackerHero.mp4" type="video/mp4" />
        </video>

        {/* Background tint — light: barely-there white wash; dark: deep black veil */}
        <div
          className="absolute inset-0"
          suppressHydrationWarning
          style={{
            background: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.08)',
          }}
        />

        {/* Bottom gradient — text readability */}
        <div
          className="absolute inset-0"
          suppressHydrationWarning
          style={{
            background: isDark
              ? 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.28) 35%, transparent 65%)'
              : 'linear-gradient(to top, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.12) 35%, transparent 65%)',
          }}
        />

        {/* Animated glow border — bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden">
          {/* Static faint base line */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(26,255,110,0.22)' }}
          />
          {/* Blurred glow layer — traveling pulse */}
          <div
            className="hero-glow-sweep absolute top-0 bottom-0 w-1/4"
            style={{
              background:
                'linear-gradient(to right, transparent 0%, #1aff6e 50%, transparent 100%)',
              filter: 'blur(3px)',
            }}
          />
          {/* Sharp bright line over blur */}
          <div
            className="hero-glow-sweep absolute top-0 bottom-0 w-1/4"
            style={{
              background:
                'linear-gradient(to right, transparent 0%, #1aff6e 50%, transparent 100%)',
            }}
          />
        </div>
      </motion.div>
    </>
  )
}
