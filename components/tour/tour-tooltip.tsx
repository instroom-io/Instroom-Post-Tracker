'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { TourRect } from './tour-spotlight'

interface TourTooltipProps {
  title: string
  description: string
  currentStep: number
  totalSteps: number
  targetRect: TourRect | null
  side: 'right' | 'left' | 'bottom'
  isCompletion: boolean
  tourId: 'agency' | 'workspace' | 'campaign' | 'campaigns-list'
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

const TOOLTIP_WIDTH = 256
const TOOLTIP_GAP = 16
const PAD = 6

const COMPLETION_TEXT: Record<'agency' | 'workspace' | 'campaign' | 'campaigns-list', string> = {
  agency: 'You now know your way around the agency dashboard. Come back to this tour any time using the Take a tour button in the header.',
  workspace: 'You now know your way around Instroom. Come back to this tour any time using the ? Take a tour button in the sidebar.',
  campaign: 'You now know your way around this campaign. Come back to this tour any time using the Take a tour button in the campaign header.',
  'campaigns-list': 'You know how campaigns work. Create your first campaign with the New campaign button, then open it to set up tracking. Come back to this tour any time using the Take a tour button.',
}

export function TourTooltip({
  title,
  description,
  currentStep,
  totalSteps,
  targetRect,
  side,
  isCompletion,
  tourId,
  onNext,
  onPrev,
  onSkip,
}: TourTooltipProps) {
  const isFirst = currentStep === 0

  // Compute position
  let left: number
  let top: number

  if (isCompletion || !targetRect) {
    // Center on screen for completion card
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
    left = viewportWidth / 2 - TOOLTIP_WIDTH / 2
    top = viewportHeight / 2 - 160
  } else {
    const rectCy = targetRect.y - PAD
    const rectCh = targetRect.height + PAD * 2

    if (side === 'right') {
      left = targetRect.x + targetRect.width + PAD + TOOLTIP_GAP
      top = rectCy + rectCh / 2 - 100
    } else if (side === 'left') {
      left = targetRect.x - PAD - TOOLTIP_GAP - TOOLTIP_WIDTH
      top = rectCy + rectCh / 2 - 100
    } else {
      // bottom
      left = targetRect.x + targetRect.width / 2 - TOOLTIP_WIDTH / 2
      top = targetRect.y + targetRect.height + PAD + TOOLTIP_GAP
    }

    // Clamp to stay within viewport
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1280
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800
    left = Math.max(12, Math.min(left, viewportWidth - TOOLTIP_WIDTH - 12))
    top = Math.max(12, Math.min(top, viewportHeight - 248 - 12))
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isCompletion ? 'completion' : currentStep}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.2 } }}
        exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
        className="fixed z-[9999] rounded-xl border border-border bg-background-surface"
        style={{
          left,
          top,
          width: TOOLTIP_WIDTH,
          boxShadow: '0 8px 40px rgba(0,0,0,0.45)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={isCompletion ? "Tour complete" : `Tour step ${currentStep + 1} of ${totalSteps}: ${title}`}
        aria-describedby={`tour-tooltip-description-${isCompletion ? 'completion' : currentStep}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4">
          {/* Progress dots + counter */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'inline-block h-[3px] w-[18px] rounded-full transition-colors duration-200',
                    isCompletion || i < currentStep ? 'bg-brand' : i === currentStep ? 'bg-brand' : 'bg-border-strong'
                  )}
                />
              ))}
            </div>
            {!isCompletion && (
              <span className="text-[10px] text-foreground-muted">
                {currentStep + 1} / {totalSteps}
              </span>
            )}
          </div>

          {/* Completion checkmark icon */}
          {isCompletion && (
            <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-brand-muted">
              <Check size={18} className="text-brand" />
            </div>
          )}

          {/* Title */}
          <p className="mb-1.5 text-sm font-bold text-foreground">
            {isCompletion ? "You're all set!" : title}
          </p>

          {/* Description */}
          <p
            id={`tour-tooltip-description-${isCompletion ? 'completion' : currentStep}`}
            className="mb-4 text-xs leading-relaxed text-foreground-light"
          >
            {isCompletion ? COMPLETION_TEXT[tourId] : description}
          </p>

          {/* Actions */}
          {isCompletion ? (
            <button
              onClick={onNext}
              className="w-full rounded-md bg-brand py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            >
              Start exploring →
            </button>
          ) : (
            <div className="flex items-center justify-between">
              <button
                onClick={onSkip}
                className="text-[11px] text-foreground-muted transition-colors hover:text-foreground"
              >
                Skip tour
              </button>
              <div className="flex gap-1.5">
                {!isFirst && (
                  <button
                    onClick={onPrev}
                    className="rounded-md border border-border bg-background-muted px-2.5 py-1.5 text-[11px] text-foreground-light transition-colors hover:bg-background-surface"
                  >
                    ← Back
                  </button>
                )}
                <button
                  onClick={onNext}
                  className="rounded-md bg-brand px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
