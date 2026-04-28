'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Prevent hydration mismatch — next-themes resolves theme client-side
  if (!mounted) return <div className="h-8 w-8" />

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/55 transition-colors hover:border-white/25 hover:text-white/80"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? 'sun' : 'moon'}
          initial={{ scale: 0.6, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.6, opacity: 0, rotate: 30 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="flex items-center justify-center"
        >
          {isDark ? (
            <Sun size={15} strokeWidth={1.75} />
          ) : (
            <Moon size={15} strokeWidth={1.75} />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
