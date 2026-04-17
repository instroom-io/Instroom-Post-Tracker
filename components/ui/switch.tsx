'use client'

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  'aria-label'?: string
  size?: 'sm' | 'md'
  'data-testid'?: string
}

const sizes = {
  sm: { track: 'h-4 w-7', thumb: 'h-3 w-3', translateX: 12 },
  md: { track: 'h-5 w-9', thumb: 'h-4 w-4', translateX: 16 },
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  'aria-label': ariaLabel,
  size = 'md',
  'data-testid': dataTestId,
}: SwitchProps) {
  const shouldReduceMotion = useReducedMotion()
  const { track, thumb, translateX } = sizes[size]

  const springTransition = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 500, damping: 30 }

  const tapTransition = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 400, damping: 25 }

  const checkTransition = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 600, damping: 28, delay: 0.05 }

  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      data-testid={dataTestId}
      onClick={() => onCheckedChange(!checked)}
      whileTap={disabled ? undefined : { scale: 0.88 }}
      transition={tapTransition}
      className={cn(
        'relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-colors duration-200',
        checked ? 'bg-brand' : 'bg-foreground-muted',
        track
      )}
    >
      {/* Sliding thumb */}
      <motion.span
        className={cn(
          'pointer-events-none relative flex flex-shrink-0 items-center justify-center rounded-full bg-background-surface shadow',
          thumb
        )}
        animate={{ x: checked ? translateX : 0 }}
        transition={springTransition}
      >
        {/* Checkmark — pops in when checked */}
        <AnimatePresence>
          {checked && (
            <motion.span
              key="check"
              className="absolute inset-0 flex items-center justify-center text-brand"
              initial={{ scale: 0, opacity: 0, rotate: -45 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0, rotate: -45 }}
              transition={checkTransition}
            >
              <svg
                width="9"
                height="7"
                viewBox="0 0 9 7"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M1 3.5L3.5 6L8 1"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
    </motion.button>
  )
}
