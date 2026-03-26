'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

const options = [
  { value: 'light',  icon: Sun,     label: 'Light',  activeClass: 'text-amber-400' },
  { value: 'system', icon: Monitor, label: 'System', activeClass: 'text-brand'     },
  { value: 'dark',   icon: Moon,    label: 'Dark',   activeClass: 'text-accent'    },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return <div className="h-[30px] w-[82px]" />

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex items-center rounded-full border border-border bg-background-muted p-[3px]"
    >
      {options.map(({ value, icon: Icon, label, activeClass }) => {
        const isActive = theme === value
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            aria-label={label}
            title={label}
            className={cn(
              'relative flex h-6 w-6 items-center justify-center rounded-full transition-colors duration-150',
              isActive ? activeClass : 'text-foreground-muted hover:text-foreground-light'
            )}
          >
            {isActive && (
              <motion.span
                layoutId="theme-pill"
                className="absolute inset-0 rounded-full bg-background-surface shadow-xs border border-border"
                transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}
              />
            )}
            <motion.span
              className="relative z-10 flex items-center justify-center"
              animate={{ scale: isActive ? 1 : 0.85 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <Icon size={12} strokeWidth={isActive ? 2.25 : 1.75} />
            </motion.span>
          </button>
        )
      })}
    </div>
  )
}
