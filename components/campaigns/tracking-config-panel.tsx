'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { TagInput } from '@/components/ui/tag-input'
import { Button } from '@/components/ui/button'
import { upsertTrackingConfig } from '@/lib/actions/campaigns'
import { cn } from '@/lib/utils'
import type { Platform, CampaignTrackingConfig } from '@/lib/types'

interface TrackingConfigPanelProps {
  campaignId: string
  workspaceId: string
  platforms: Platform[]
  configs: CampaignTrackingConfig[]
  canEdit: boolean
}

export function TrackingConfigPanel({
  campaignId,
  workspaceId,
  platforms,
  configs,
  canEdit,
}: TrackingConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<Platform>(platforms[0] ?? 'instagram')
  const [isPending, startTransition] = useTransition()

  // Build mutable config state per platform
  const [configState, setConfigState] = useState<
    Record<Platform, { hashtags: string[]; mentions: string[] }>
  >(() => {
    const initial: Record<Platform, { hashtags: string[]; mentions: string[] }> =
      {} as Record<Platform, { hashtags: string[]; mentions: string[] }>

    platforms.forEach((p) => {
      const existing = configs.find((c) => c.platform === p)
      initial[p] = {
        hashtags: existing?.hashtags ?? [],
        mentions: existing?.mentions ?? [],
      }
    })
    return initial
  })

  function handleSave(platform: Platform) {
    startTransition(async () => {
      const result = await upsertTrackingConfig(workspaceId, {
        campaign_id: campaignId,
        platform,
        hashtags: configState[platform].hashtags,
        mentions: configState[platform].mentions,
      })

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`${platform} tracking saved`)
      }
    })
  }

  if (platforms.length === 0) {
    return (
      <p className="text-[12px] text-foreground-lighter p-5">
        No platforms configured for this campaign.
      </p>
    )
  }

  return (
    <div>
      {/* Platform tabs */}
      <div className="flex border-b border-border">
        {platforms.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setActiveTab(p)}
            className={cn(
              'px-4 py-2.5 text-[13px] font-medium capitalize transition-colors',
              activeTab === p
                ? 'border-b-2 border-brand text-brand'
                : 'text-foreground-lighter hover:text-foreground'
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Config for active platform */}
      <div className="space-y-4 p-5">
        <TagInput
          label="Hashtags"
          tags={configState[activeTab]?.hashtags ?? []}
          onChange={(tags) =>
            setConfigState((prev) => ({
              ...prev,
              [activeTab]: { ...prev[activeTab], hashtags: tags },
            }))
          }
          prefix="#"
          placeholder="Type hashtag and press Enter"
          hint="Track posts that include these hashtags"
          disabled={!canEdit}
        />

        <TagInput
          label="Mentions"
          tags={configState[activeTab]?.mentions ?? []}
          onChange={(tags) =>
            setConfigState((prev) => ({
              ...prev,
              [activeTab]: { ...prev[activeTab], mentions: tags },
            }))
          }
          prefix="@"
          placeholder="Type handle and press Enter"
          hint="Track posts that mention these accounts"
          disabled={!canEdit}
        />

        {canEdit && (
          <Button
            variant="primary"
            size="md"
            loading={isPending}
            onClick={() => handleSave(activeTab)}
          >
            Save
          </Button>
        )}
      </div>
    </div>
  )
}
