'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

const options = [
  { value: 'light',  icon: Sun,     label: 'Light' },
  { value: 'system', icon: Monitor, label: 'System' },
  { value: 'dark',   icon: Moon,    label: 'Dark' },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch — render placeholder until client mounts
  if (!mounted) {
    return <div className="h-7 w-[76px]" />
  }

  return (
    <div
      className="flex items-center rounded-lg border border-border bg-background-muted p-0.5"
      role="group"
      aria-label="Theme"
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          aria-label={label}
          title={label}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
            theme === value
              ? 'bg-background-surface text-foreground shadow-sm'
              : 'text-foreground-muted hover:text-foreground'
          )}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  )
}
