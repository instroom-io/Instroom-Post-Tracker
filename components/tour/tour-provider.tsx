'use client'

import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useTour } from '@/lib/hooks/use-tour'
import { TOUR_STEPS } from '@/lib/tour/steps'
import { TourSpotlight } from './tour-spotlight'
import { TourTooltip } from './tour-tooltip'
import type { TourRect } from './tour-spotlight'

interface TourProviderProps {
  tourId: 'agency' | 'workspace' | 'campaign'
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
  const step = steps[currentStep]
  const isThisTourActive = isActive && activeTourId === tourId

  const handleNext = useCallback(() => {
    if (currentStep === steps.length - 1) endTour()
    else nextStep()
  }, [currentStep, steps.length, endTour, nextStep])

  // Query DOM, set rect, observe resize
  useEffect(() => {
    if (!isThisTourActive || !step) return

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
  }, [isThisTourActive, step, nextStep])

  // Keyboard navigation
  useEffect(() => {
    if (!isThisTourActive) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skipTour()
      else if (e.key === 'ArrowRight') handleNext()
      else if (e.key === 'ArrowLeft') prevStep()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isThisTourActive, handleNext, prevStep, skipTour])

  // SSR safety — portals require document
  useEffect(() => setMounted(true), [])

  if (!mounted || !isThisTourActive || !step) return null

  return createPortal(
    <>
      <TourSpotlight targetRect={targetRect} onClickOverlay={skipTour} />
      <TourTooltip
        title={step.title}
        description={step.description}
        currentStep={currentStep}
        totalSteps={steps.length}
        targetRect={targetRect}
        side={step.side}
        onNext={handleNext}
        onPrev={prevStep}
        onSkip={skipTour}
      />
    </>,
    document.body
  )
}
