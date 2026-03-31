'use client'

import { useOptimistic, useTransition } from 'react'
import { toast } from 'sonner'
import { WarningCircle, Users } from '@phosphor-icons/react'
import { toggleUsageRights } from '@/lib/actions/usage-rights'
import { getInfluencerLabel } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'

interface CampaignInfluencer {
  id: string
  usage_rights: boolean
  influencer: { tiktok_handle: string | null; ig_handle: string | null; youtube_handle: string | null; profile_pic_url: string | null } | null
  campaign: { name: string } | null
}

interface UsageRightsPanelProps {
  items: CampaignInfluencer[]
  canEdit: boolean
}

export function UsageRightsPanel({ items, canEdit }: UsageRightsPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [optimisticItems, updateOptimistic] = useOptimistic(
    items,
    (state, { id, value }: { id: string; value: boolean }) =>
      state.map((item) =>
        item.id === id ? { ...item, usage_rights: value } : item
      )
  )

  function handleToggle(id: string, currentValue: boolean) {
    const newValue = !currentValue
    startTransition(async () => {
      updateOptimistic({ id, value: newValue })
      const result = await toggleUsageRights(id, newValue)
      if (result && 'error' in result) {
        toast.error(result.error)
      }
    })
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background-muted">
          <Users size={18} className="text-foreground-muted" />
        </div>
        <p className="font-display text-[14px] font-bold text-foreground">No influencers added</p>
        <p className="max-w-xs text-[13px] text-foreground-lighter">
          Add influencers to campaigns to manage usage rights here.
        </p>
      </div>
    )
  }

  return (
    <div data-tour="ws-usage-rights" className="max-h-[260px] overflow-y-auto divide-y divide-border/50">
      {optimisticItems.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between px-5 py-3"
        >
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            {item.influencer?.profile_pic_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.influencer.profile_pic_url}
                alt=""
                className="h-7 w-7 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-background-muted text-[11px] font-semibold text-foreground-muted">
                {(item.influencer ? getInfluencerLabel(item.influencer) : '?')[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-foreground">
                @{item.influencer ? getInfluencerLabel(item.influencer) : 'Unknown'}
              </p>
              <p className="text-[11px] text-foreground-lighter">
                {item.campaign?.name ?? ''}
              </p>
            </div>
          </div>

          <div className="ml-4 flex items-center gap-2">
            {!item.usage_rights && (
              <WarningCircle size={13} className="text-warning flex-shrink-0" />
            )}
            <Switch
              size="sm"
              checked={item.usage_rights}
              onCheckedChange={() => handleToggle(item.id, item.usage_rights)}
              disabled={!canEdit || isPending}
              aria-label={`Toggle usage rights for @${item.influencer ? getInfluencerLabel(item.influencer) : 'influencer'}`}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
