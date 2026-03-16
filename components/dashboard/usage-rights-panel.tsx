'use client'

import { useOptimistic, useTransition } from 'react'
import { toast } from 'sonner'
import { AlertCircle } from 'lucide-react'
import { toggleUsageRights } from '@/lib/actions/usage-rights'
import { cn } from '@/lib/utils'

interface CampaignInfluencer {
  id: string
  usage_rights: boolean
  influencer: { full_name: string; ig_handle: string | null } | null
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
      if (result?.error) {
        toast.error(result.error)
      }
    })
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="text-3xl">👥</div>
        <p className="font-display text-[15px] font-bold text-foreground">
          No influencers added
        </p>
        <p className="max-w-xs text-[13px] text-foreground-lighter">
          Add influencers to campaigns to manage usage rights here.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border/50">
      {optimisticItems.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between px-5 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-foreground">
              {item.influencer?.full_name ?? 'Unknown'}
            </p>
            <p className="text-[11px] text-foreground-lighter">
              {item.campaign?.name ?? ''}
              {item.influencer?.ig_handle
                ? ` · @${item.influencer.ig_handle}`
                : ''}
            </p>
          </div>

          <div className="ml-4 flex items-center gap-2">
            {!item.usage_rights && (
              <AlertCircle size={13} className="text-warning flex-shrink-0" />
            )}

            {/* Toggle */}
            <button
              type="button"
              disabled={!canEdit || isPending}
              onClick={() => handleToggle(item.id, item.usage_rights)}
              className={cn(
                'relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                'transition-colors duration-200 focus:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50',
                item.usage_rights ? 'bg-brand' : 'bg-foreground-muted'
              )}
              aria-checked={item.usage_rights}
              role="switch"
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow',
                  'transform transition-transform duration-200',
                  item.usage_rights ? 'translate-x-3' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
