'use client'

import { useEffect } from 'react'
import { HelpCircle } from 'lucide-react'
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
  return (
    <button
      onClick={() => startTour('agency')}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground"
    >
      <HelpCircle size={13} />
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
