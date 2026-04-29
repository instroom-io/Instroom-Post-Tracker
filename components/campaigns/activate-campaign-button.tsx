'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { activateCampaignById } from '@/lib/actions/campaigns'

interface Props {
  campaignId: string
  workspaceId: string
  campaignStatus: string
  missingPlatforms: string[]
  endDateBlocking: boolean
  influencerCount: number
}

export function ActivateCampaignButton({
  campaignId,
  workspaceId,
  campaignStatus,
  missingPlatforms,
  endDateBlocking,
  influencerCount,
}: Props) {
  const [isPending, startTransition] = useTransition()

  const isBlocked = influencerCount === 0 || missingPlatforms.length > 0 || endDateBlocking

  function handleClick() {
    if (influencerCount === 0) {
      toast.warning('Add at least one influencer to activate this campaign.')
      return
    }
    if (missingPlatforms.length > 0) {
      const list = missingPlatforms
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(', ')
      toast.warning('Tracking config incomplete.', {
        description: `Add hashtags and mentions for: ${list}.`,
      })
      return
    }
    if (endDateBlocking) {
      toast.warning('End date has passed.', {
        description: 'Update or clear the end date before re-activating.',
      })
      return
    }
    startTransition(async () => {
      const result = await activateCampaignById(workspaceId, campaignId)
      if (result?.error) {
        toast.error(result.error)
      }
    })
  }

  return (
    <Button
      variant="primary"
      size="sm"
      onClick={handleClick}
      loading={isPending}
      className={isBlocked ? 'opacity-60 cursor-not-allowed' : ''}
    >
      {campaignStatus === 'ended' ? 'Re-activate' : 'Activate'}
    </Button>
  )
}
