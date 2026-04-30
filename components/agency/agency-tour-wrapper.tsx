'use client'

import { useEffect, useRef } from 'react'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import helpAnim from 'react-useanimations/lib/help'
import { TourProvider } from '@/components/tour/tour-provider'
import { useTour } from '@/lib/hooks/use-tour'

function AgencyTourAutoStart() {
  const { hasSeenAgencyTour, startTour } = useTour()
  useEffect(() => {
    if (!hasSeenAgencyTour) {
      const t = setTimeout(() => startTour('agency'), 600)
      return () => clearTimeout(t)
    }
  }, [hasSeenAgencyTour, startTour])
  return null
}

export function AgencyTourButton() {
  const { startTour } = useTour()
  const helpRef = useRef<LottieRefCurrentProps>(null)
  return (
    <button
      onClick={() => startTour('agency')}
      onMouseEnter={() => helpRef.current?.goToAndPlay(0, true)}
      onMouseLeave={() => helpRef.current?.stop()}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground"
    >
      <div className="flex-shrink-0 [filter:brightness(0)_opacity(0.45)] dark:[filter:brightness(0)_invert(1)_opacity(0.45)]">
        <Lottie lottieRef={helpRef} animationData={helpAnim.animationData} loop={false} autoplay={false} style={{ width: 13, height: 13 }} />
      </div>
      Take a tour
    </button>
  )
}

export function AgencyTourWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TourProvider tourId="agency" />
      <AgencyTourAutoStart />
    </>
  )
}
