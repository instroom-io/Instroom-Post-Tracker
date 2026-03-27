'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTour } from '@/lib/hooks/use-tour'
import { TOUR_STEPS } from '@/lib/tour/steps'
import { TourSpotlight } from './tour-spotlight'
import { TourTooltip } from './tour-tooltip'
import type { TourRect } from './tour-spotlight'

interface TourProviderProps {
  tourId: 'agency' | 'workspace' | 'campaign' | 'campaigns-list'
}

export function TourProvider({ tourId }: TourProviderProps) {
  const {
    isActive,
    currentStep,
    tourId: activeTourId,
    nextStep,
    prevStep,
    skipTour,
    endTour,
  } = useTour()

  const [targetRect, setTargetRect] = useState<TourRect | null>(null)
  const [mounted, setMounted] = useState(false)

  const steps = TOUR_STEPS[tourId]
  const isThisTourActive = isActive && activeTourId === tourId
  // Virtual completion step sits at index === steps.length (one past the last real step)
  const isCompletion = currentStep >= steps.length
  const step = isCompletion ? undefined : steps[currentStep]

  const handleNext = useCallback(() => {
    if (isCompletion) { endTour(); return }
    nextStep()
  }, [isCompletion, endTour, nextStep])

  // Query DOM, set rect, observe resize — only for real steps
  useEffect(() => {
    if (!isThisTourActive || isCompletion || !step) return

    const el = document.querySelector(`[data-tour="${step.id}"]`)
    if (!el) {
      // Element not in DOM — defer skip to avoid synchronous loop
      const timer = setTimeout(() => nextStep(), 0)
      return () => clearTimeout(timer)
    }

    const updateRect = () => {
      const r = el.getBoundingClientRect()
      setTargetRect({ x: r.left, y: r.top, width: r.width, height: r.height })
    }
    updateRect()

    const resizeObserver = new ResizeObserver(updateRect)
    resizeObserver.observe(el)
    window.addEventListener('resize', updateRect)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateRect)
    }
  }, [isThisTourActive, isCompletion, step, nextStep])

  // Clear rect when entering completion state
  useEffect(() => {
    if (isCompletion) setTargetRect(null)
  }, [isCompletion])

  // Keyboard navigation
  useEffect(() => {
    if (!isThisTourActive) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skipTour()
      else if (e.key === 'ArrowRight') handleNext()
      else if (e.key === 'ArrowLeft' && !isCompletion) prevStep()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isThisTourActive, isCompletion, handleNext, prevStep, skipTour])

  // SSR safety — portals require document
  useEffect(() => setMounted(true), [])

  if (!mounted || !isThisTourActive) return null

  return createPortal(
    <>
      {!isCompletion && (
        <TourSpotlight targetRect={targetRect} onClickOverlay={skipTour} />
      )}
      <TourTooltip
        title={step?.title ?? ''}
        description={step?.description ?? ''}
        currentStep={currentStep}
        totalSteps={steps.length}
        targetRect={targetRect}
        side={step?.side ?? 'right'}
        isCompletion={isCompletion}
        tourId={tourId}
        onNext={handleNext}
        onPrev={prevStep}
        onSkip={skipTour}
      />
    </>,
    document.body
  )
}
