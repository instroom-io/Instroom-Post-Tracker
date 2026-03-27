'use client'

import { useEffect } from 'react'
import { HelpCircle } from 'lucide-react'
import { TourProvider } from '@/components/tour/tour-provider'
import { useTour } from '@/lib/hooks/use-tour'

export function CampaignTourWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <TourProvider tourId="campaign" />
      <CampaignTourAutoStart />
    </>
  )
}

export function CampaignTourButton() {
  const { startTour } = useTour()
  return (
    <button
      onClick={() => startTour('campaign')}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground"
    >
      <HelpCircle size={13} />
      Take a tour
    </button>
  )
}

function CampaignTourAutoStart() {
  const { hasSeenCampaignTour, startTour } = useTour()
  useEffect(() => {
    if (!hasSeenCampaignTour) {
      const t = setTimeout(() => startTour('campaign'), 600)
      return () => clearTimeout(t)
    }
  }, [hasSeenCampaignTour, startTour])
  return null
}
