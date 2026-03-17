'use client'

import { motion } from 'framer-motion'
import { Instagram, Music, Play } from 'lucide-react'

export function RadarPulse() {
  const sizes = [40, 60, 80]

  return (
    <div className="absolute inset-0 flex items-center justify-center w-[200px] pointer-events-none">
      {sizes.map((size, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-brand/10"
          style={{ width: size, height: size }}
          animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 1,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  )
}

export function PlatformOrbs() {
  return (
    <div className="hidden lg:block pointer-events-none">
      <motion.div
        className="absolute top-[10%] right-[-8px] bg-background-surface border border-border shadow-sm dark:bg-white/5 dark:border-white/10 dark:backdrop-blur-md rounded-full w-12 h-12 flex items-center justify-center"
        animate={{ y: [0, -15, 0], x: [0, 8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Instagram className="w-5 h-5 text-platform-instagram" />
      </motion.div>

      <motion.div
        className="absolute bottom-[20%] right-[10%] bg-background-surface border border-border shadow-sm dark:bg-white/5 dark:border-white/10 dark:backdrop-blur-md rounded-full w-12 h-12 flex items-center justify-center"
        animate={{ y: [0, 12, 0], x: [0, -10, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Music className="w-5 h-5 text-platform-tiktok" />
      </motion.div>

      <motion.div
        className="absolute top-[50%] right-[-8px] bg-background-surface border border-border shadow-sm dark:bg-white/5 dark:border-white/10 dark:backdrop-blur-md rounded-full w-12 h-12 flex items-center justify-center"
        animate={{ y: [0, -10, 0], x: [0, -6, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Play className="w-5 h-5 text-platform-youtube" />
      </motion.div>
    </div>
  )
}

export function FloatingMetricBadges() {
  const badges = [
    { label: '847 posts', top: '15%', left: '5%', duration: 16 },
    { label: '€12.4k EMV', top: '60%', left: '2%', duration: 19 },
    { label: '94% ER', top: '80%', left: '15%', duration: 15 },
  ]

  return (
    <div className="hidden lg:block pointer-events-none">
      {badges.map((badge, i) => (
        <motion.div
          key={i}
          className="absolute bg-background-surface border border-border shadow-sm dark:bg-white/5 dark:border-white/10 dark:backdrop-blur-md rounded-full px-3 py-1 text-[10px] text-foreground-lighter font-medium"
          style={{ top: badge.top, left: badge.left }}
          animate={{
            y: [0, -8, 0, 6, 0],
            x: [0, 5, 0, -4, 0],
          }}
          transition={{
            duration: badge.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 2,
          }}
        >
          {badge.label}
        </motion.div>
      ))}
    </div>
  )
}

export function ConnectionLines() {
  return (
    <svg
      className="absolute inset-0 w-full h-full hidden lg:block pointer-events-none"
      preserveAspectRatio="none"
    >
      <motion.path
        d="M 100 200 Q 300 100 500 250"
        fill="none"
        stroke="rgba(31,174,91,0.08)"
        strokeWidth={1}
        strokeDasharray="4 4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 3, ease: 'easeInOut' }}
      />
      <motion.path
        d="M 200 400 Q 450 300 700 350"
        fill="none"
        stroke="rgba(31,174,91,0.08)"
        strokeWidth={1}
        strokeDasharray="4 4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 3, delay: 0.5, ease: 'easeInOut' }}
      />
      <motion.path
        d="M 50 300 Q 250 250 400 150"
        fill="none"
        stroke="rgba(31,174,91,0.08)"
        strokeWidth={1}
        strokeDasharray="4 4"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 3, delay: 1, ease: 'easeInOut' }}
      />
    </svg>
  )
}
