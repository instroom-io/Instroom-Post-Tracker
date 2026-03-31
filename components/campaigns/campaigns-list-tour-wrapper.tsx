'use client'

import { useEffect } from 'react'
import { Question } from '@phosphor-icons/react'
import { TourProvider } from '@/components/tour/tour-provider'
import { useTour } from '@/lib/hooks/use-tour'

export function CampaignsListTourWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TourProvider tourId="campaigns-list" />
      <CampaignsListTourAutoStart />
    </>
  )
}

export function CampaignsListTourButton() {
  const { startTour } = useTour()
  return (
    <button
      onClick={() => startTour('campaigns-list')}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground"
    >
      <Question size={13} />
      Take a tour
    </button>
  )
}

function CampaignsListTourAutoStart() {
  const { hasSeenCampaignsTour, startTour } = useTour()
  useEffect(() => {
    if (!hasSeenCampaignsTour) {
      const t = setTimeout(() => startTour('campaigns-list'), 600)
      return () => clearTimeout(t)
    }
  }, [hasSeenCampaignsTour, startTour])
  return null
}
