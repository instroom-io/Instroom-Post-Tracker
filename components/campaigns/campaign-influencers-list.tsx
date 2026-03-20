'use client'

import { useOptimistic, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import { MoreHorizontal, Trash2, AlertCircle, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { toggleUsageRights } from '@/lib/actions/usage-rights'
import { removeInfluencerFromCampaign, updateProductSentAt } from '@/lib/actions/influencers'
import { cn, getInfluencerLabel } from '@/lib/utils'
import type { Platform } from '@/lib/types'

interface InfluencerRow {
  id: string // campaign_influencer id
  usage_rights: boolean
  monitoring_status: string
  product_sent_at: string | null
  influencer: {
    id: string
    ig_handle: string | null
    tiktok_handle: string | null
    youtube_handle: string | null
  }
}

interface CampaignInfluencersListProps {
  items: InfluencerRow[]
  workspaceId: string
  campaignId: string
  canEdit: boolean
  onAddInfluencer?: () => void
  postCountsByInfluencerId?: Record<string, number>
}

// Thin wrapper so date input can call a transition
function ProductSentDateCell({ row, canEdit, workspaceId }: { row: InfluencerRow; canEdit: boolean; workspaceId: string }) {
  const [, startTransition] = useTransition()
  return (
    <input
      type="date"
      defaultValue={row.product_sent_at ?? ''}
      disabled={!canEdit}
      onChange={(e) => {
        startTransition(async () => {
          await updateProductSentAt(workspaceId, {
            campaignInfluencerId: row.id,
            productSentAt: e.target.value || null,
          })
        })
      }}
      className="rounded border border-border bg-transparent px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
    />
  )
}

const platformsForInfluencer = (inf: InfluencerRow['influencer']): Platform[] => {
  const platforms: Platform[] = []
  if (inf.ig_handle) platforms.push('instagram')
  if (inf.tiktok_handle) platforms.push('tiktok')
  if (inf.youtube_handle) platforms.push('youtube')
  return platforms
}

const platformVariant: Record<Platform, 'instagram' | 'tiktok' | 'youtube'> = {
  instagram: 'instagram',
  tiktok: 'tiktok',
  youtube: 'youtube',
}

export function CampaignInfluencersList({
  items,
  workspaceId,
  canEdit,
  onAddInfluencer,
  postCountsByInfluencerId,
}: CampaignInfluencersListProps) {
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
      if (result?.error) toast.error(result.error)
    })
  }

  function handleRemove(campaignInfluencerId: string, name: string) {
    startTransition(async () => {
      const result = await removeInfluencerFromCampaign(campaignInfluencerId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`${name} removed from campaign`)
      }
    })
  }

  useEffect(() => {
    items.forEach((item) => {
      if (
        item.monitoring_status === 'active' &&
        (postCountsByInfluencerId?.[item.influencer.id] ?? 0) === 0
      ) {
        const handle = getInfluencerLabel(item.influencer)
        toast.warning(`No posts found for @${handle} — verify the username is correct`)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (optimisticItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background-muted">
          <Users size={18} className="text-foreground-muted" />
        </div>
        <p className="font-display text-[14px] font-bold text-foreground">No influencers added</p>
        <p className="max-w-xs text-[13px] text-foreground-lighter">
          Add influencers to enable tracking for this campaign.
        </p>
        {canEdit && onAddInfluencer && (
          <Button variant="primary" size="sm" onClick={onAddInfluencer}>
            Add influencer
          </Button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                Influencer
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                Platforms
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                Monitoring
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                Usage rights
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                Product sent
              </th>
              {canEdit && <th className="w-10 px-5 py-3" />}
            </tr>
          </thead>
          <tbody>
            {optimisticItems.map((item) => {
              const platforms = platformsForInfluencer(item.influencer)
              return (
                <tr
                  key={item.id}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-background-muted/40"
                >
                  <td className="px-5 py-3.5">
                    <p className="text-[12px] font-medium text-foreground">
                      @{getInfluencerLabel(item.influencer)}
                    </p>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1">
                      {platforms.map((p) => (
                        <Badge key={p} variant={platformVariant[p]}>
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={
                          item.monitoring_status === 'active'
                            ? 'success'
                            : item.monitoring_status === 'paused'
                            ? 'warning'
                            : 'muted'
                        }
                      >
                        {item.monitoring_status}
                      </Badge>
                      {item.monitoring_status === 'active' &&
                        (postCountsByInfluencerId?.[item.influencer.id] ?? 0) === 0 && (
                          <span title="No posts found — verify the username is correct">
                            <AlertCircle size={13} className="flex-shrink-0 text-warning" />
                          </span>
                        )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {!item.usage_rights && (
                        <AlertCircle size={13} className="text-warning flex-shrink-0" />
                      )}
                      <button
                        type="button"
                        disabled={!canEdit || isPending}
                        onClick={() => handleToggle(item.id, item.usage_rights)}
                        aria-label={`Toggle usage rights for @${getInfluencerLabel(item.influencer)}`}
                        className={cn(
                          'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
                          'transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
                          'disabled:cursor-not-allowed disabled:opacity-50',
                          item.usage_rights ? 'bg-brand' : 'bg-foreground-muted'
                        )}
                        role="switch"
                        aria-checked={item.usage_rights}
                      >
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-4 w-4 rounded-full bg-background-surface shadow transform transition-transform duration-200',
                            item.usage_rights ? 'translate-x-4' : 'translate-x-0'
                          )}
                        />
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <ProductSentDateCell row={item} canEdit={canEdit} workspaceId={workspaceId} />
                  </td>
                  {canEdit && (
                    <td className="px-3 py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <button
                            type="button"
                            className="rounded-md p-1 text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                              handleRemove(item.id, `@${getInfluencerLabel(item.influencer)}`)
                            }
                          >
                            <Trash2 size={13} />
                            Remove from campaign
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
