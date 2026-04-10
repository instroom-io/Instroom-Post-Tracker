'use client'

import { useOptimistic, useTransition, useState } from 'react'
import { toast } from 'sonner'
import { DotsThree, Trash, WarningCircle, Users, ArrowClockwise, MagnifyingGlass, Prohibit } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { PlatformLogo } from '@/components/ui/platform-icon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toggleUsageRights } from '@/lib/actions/usage-rights'
import { removeInfluencerFromCampaign, updateProductSentAt, refreshInfluencerProfile, toggleStopAfterPost } from '@/lib/actions/influencers'
import { cn, getInfluencerLabel, getInitials } from '@/lib/utils'
import { Switch } from '@/components/ui/switch'
import { differenceInDays } from 'date-fns'
import type { Platform } from '@/lib/types'

interface InfluencerRow {
  id: string // campaign_influencer id
  usage_rights: boolean
  monitoring_status: string
  product_sent_at: string | null
  added_at: string
  follow_up_1_sent_at: string | null
  follow_up_2_sent_at: string | null
  stop_after_post: boolean
  influencer: {
    id: string
    ig_handle: string | null
    tiktok_handle: string | null
    youtube_handle: string | null
    profile_pic_url: string | null
  }
}

interface CampaignInfluencersListProps {
  items: InfluencerRow[]
  workspaceId: string
  campaignId: string
  campaignStatus: string
  canEdit: boolean
  onAddInfluencer?: () => void
  postCountsByInfluencerId?: Record<string, number>
}

// Avatar cell with optional refresh button for influencers without a profile pic
function AvatarCell({ row, workspaceId }: { row: InfluencerRow; workspaceId: string }) {
  const [picUrl, setPicUrl] = useState<string | null>(row.influencer.profile_pic_url)
  const [isRefreshing, startRefresh] = useTransition()
  const label = getInfluencerLabel(row.influencer)
  const initials = getInitials(label)

  function handleRefresh(e: React.MouseEvent) {
    e.stopPropagation()
    startRefresh(async () => {
      const result = await refreshInfluencerProfile(workspaceId, row.influencer.id)
      if ('error' in result) {
        toast.error(result.error)
      } else if (result.profile_pic_url) {
        setPicUrl(result.profile_pic_url)
      } else {
        toast.error('Could not fetch profile picture')
      }
    })
  }

  if (picUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={picUrl} alt="" className="h-7 w-7 flex-shrink-0 rounded-full object-cover" />
    )
  }

  return (
    <div className="relative flex-shrink-0">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-muted text-[10px] font-bold text-brand">
        {initials}
      </div>
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isRefreshing}
        title="Fetch profile picture"
        className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background-surface border border-border text-foreground-muted transition-colors hover:text-foreground disabled:opacity-50"
      >
        <ArrowClockwise size={7} className={isRefreshing ? 'animate-spin' : ''} />
      </button>
    </div>
  )
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
          const result = await updateProductSentAt(workspaceId, {
            campaignInfluencerId: row.id,
            productSentAt: e.target.value || null,
          })
          if (result?.error) {
            toast.error(result.error)
          } else {
            toast.success('Product sent date saved')
          }
        })
      }}
      className="rounded border border-border bg-transparent px-2 py-1 text-xs text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
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


type FollowUpStatus = 'posted' | 'first_due' | 'first_sent' | 'second_due' | 'second_sent' | null

function getFollowUpStatus(
  item: InfluencerRow,
  hasPost: boolean,
  campaignStatus: string
): FollowUpStatus {
  if (campaignStatus === 'draft') return null
  if (hasPost) return 'posted'
  const clockStart = item.product_sent_at ?? item.added_at
  const daysSince = differenceInDays(new Date(), new Date(clockStart))
  if (daysSince < 10) return null
  if (!item.follow_up_1_sent_at) return 'first_due'
  if (daysSince < 13) return 'first_sent'
  if (!item.follow_up_2_sent_at) return 'second_due'
  return 'second_sent'
}

const PAGE_SIZE = 20

export function CampaignInfluencersList({
  items,
  workspaceId,
  campaignStatus,
  canEdit,
  onAddInfluencer,
  postCountsByInfluencerId,
}: CampaignInfluencersListProps) {
  const [query, setQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [optimisticItems, updateOptimistic] = useOptimistic(
    items,
    (state, { id, value }: { id: string; value: boolean }) =>
      state.map((item) =>
        item.id === id ? { ...item, usage_rights: value } : item
      )
  )

  const totalPages = Math.max(1, Math.ceil(optimisticItems.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = optimisticItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const filtered = query.trim()
    ? paginated.filter((row) => {
        const q = query.toLowerCase()
        return (
          row.influencer.ig_handle?.toLowerCase().includes(q) ||
          row.influencer.tiktok_handle?.toLowerCase().includes(q) ||
          row.influencer.youtube_handle?.toLowerCase().includes(q)
        )
      })
    : paginated

  function handleToggle(id: string, currentValue: boolean) {
    if (currentValue) {
      toast.warning('Usage rights removed', {
        description: 'New posts from this influencer will not be downloaded to Drive.',
      })
    }
    const newValue = !currentValue
    startTransition(async () => {
      updateOptimistic({ id, value: newValue })
      const result = await toggleUsageRights(id, newValue)
      if (result && 'error' in result) {
        toast.error(result.error)
      } else if (result && 'unblocked' in result && result.unblocked > 0) {
        toast.success(
          `${result.unblocked} post${result.unblocked > 1 ? 's' : ''} unblocked and queued for download`
        )
      }
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

  function handleStopAfterPost(campaignInfluencerId: string, currentValue: boolean) {
    startTransition(async () => {
      const result = await toggleStopAfterPost(campaignInfluencerId, !currentValue)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(!currentValue ? 'Will stop after first post' : 'Stop after post disabled')
      }
    })
  }

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
      <div className="px-5 py-3 border-b border-border">
        <div className="relative w-48">
          <MagnifyingGlass size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted pointer-events-none" />
          <Input
            type="text"
            placeholder="Search influencers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-7 h-7 text-[12px]"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-lighter">
                Influencer
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-lighter">
                Platforms
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-lighter">
                Status
              </th>
              <th data-tour="campaign-usage-rights" className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-lighter">
                Usage rights
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-lighter">
                Product sent
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-lighter">
                Follow-up
              </th>
              {canEdit && <th className="w-10 px-5 py-3" />}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const platforms = platformsForInfluencer(item.influencer)
              return (
                <tr
                  key={item.id}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-background-muted"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <AvatarCell row={item} workspaceId={workspaceId} />
                      <p className="text-[12px] font-medium text-foreground">
                        @{getInfluencerLabel(item.influencer)}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-1.5">
                      {platforms.map((p) => (
                        <PlatformLogo key={p} platform={p} size={13} className="text-[12px] font-medium text-foreground-muted" />
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
                            : item.monitoring_status === 'stopped'
                            ? 'muted'
                            : 'muted'
                        }
                      >
                        {item.monitoring_status === 'stopped' ? 'Auto-stopped' : item.monitoring_status}
                      </Badge>
                      {item.monitoring_status === 'active' &&
                        (postCountsByInfluencerId?.[item.influencer.id] ?? 0) === 0 && (
                          <span title="No matching posts yet — check captions for tracking keywords">
                            <WarningCircle size={13} className="flex-shrink-0 text-warning" />
                          </span>
                        )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {!item.usage_rights && (
                        <WarningCircle size={13} className="text-warning flex-shrink-0" />
                      )}
                      <Switch
                        size="md"
                        checked={item.usage_rights}
                        onCheckedChange={() => handleToggle(item.id, item.usage_rights)}
                        disabled={!canEdit || isPending}
                        aria-label={`Toggle usage rights for @${getInfluencerLabel(item.influencer)}`}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <ProductSentDateCell row={item} canEdit={canEdit} workspaceId={workspaceId} />
                  </td>
                  <td className="px-5 py-3.5">
                    {(() => {
                      const hasPost = (postCountsByInfluencerId?.[item.influencer.id] ?? 0) > 0
                      const status = getFollowUpStatus(item, hasPost, campaignStatus)
                      if (!status) return null
                      if (status === 'posted') return <Badge variant="success">Posted</Badge>
                      if (status === 'first_due') return <Badge variant="warning">Follow up</Badge>
                      if (status === 'first_sent') return <Badge variant="muted">1st sent</Badge>
                      if (status === 'second_due') return <Badge variant="destructive">Follow up again</Badge>
                      return <Badge variant="muted">2nd sent</Badge>
                    })()}
                  </td>
                  {canEdit && (
                    <td className="px-3 py-3.5">
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <button
                            type="button"
                            className="rounded-md p-1 text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground"
                          >
                            <DotsThree size={14} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="justify-between gap-8 pr-2"
                            onClick={() => handleStopAfterPost(item.id, item.stop_after_post)}
                          >
                            <span className="flex items-center gap-2">
                              <Prohibit size={13} />
                              Stop after first post
                            </span>
                            <span className="pointer-events-none" aria-hidden>
                              <Switch
                                size="sm"
                                checked={item.stop_after_post}
                                onCheckedChange={() => {}}
                              />
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                              handleRemove(item.id, `@${getInfluencerLabel(item.influencer)}`)
                            }
                          >
                            <Trash size={13} />
                            Remove from campaign
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  )}
                </tr>
              )
            })}
            {filtered.length === 0 && query.trim() && (
              <tr>
                <td colSpan={canEdit ? 7 : 6} className="px-5 py-10 text-center text-[12px] text-foreground-muted">
                  No influencers match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <p className="text-[11px] text-foreground-muted">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, optimisticItems.length)} of{' '}
            {optimisticItems.length} influencers
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="rounded-md border border-border bg-background-muted px-2.5 py-1.5 text-[11px] font-medium text-foreground-light transition-colors hover:bg-background-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="min-w-[56px] text-center text-[11px] text-foreground-muted">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="rounded-md border border-border bg-background-muted px-2.5 py-1.5 text-[11px] font-medium text-foreground-light transition-colors hover:bg-background-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
