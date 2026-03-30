'use client'

import React, { useState, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Trash2,
  Search,
  Users,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { PlatformIcon } from '@/components/ui/platform-icon'
import { Tooltip } from '@/components/ui/tooltip'
import { removeInfluencerFromWorkspace, removeInfluencerFromCampaign } from '@/lib/actions/influencers'
import { getInfluencerLabel, getInitials, cn } from '@/lib/utils'
import type { CampaignStatus, MonitoringStatus } from '@/lib/types'

export interface CampaignEntry {
  campaign_influencer_id: string
  campaign_id: string
  name: string
  status: CampaignStatus
  monitoring_status: MonitoringStatus
}

export interface InfluencerWithCampaigns {
  id: string
  ig_handle: string | null
  tiktok_handle: string | null
  youtube_handle: string | null
  profile_pic_url: string | null
  campaigns: CampaignEntry[]
}

interface InfluencerListTableProps {
  influencers: InfluencerWithCampaigns[]
  workspaceCampaigns: Array<{ id: string; name: string }>
  campaignFilter: string
  canEdit: boolean
  workspaceSlug: string
  workspaceId: string
  page: number
  totalCount: number
  pageSize: number
}

function MonitoringBadge({ status }: { status: MonitoringStatus }) {
  const styles: Record<MonitoringStatus, string> = {
    active:  'bg-brand/10 text-brand',
    pending: 'bg-warning/10 text-warning',
    paused:  'bg-foreground-muted/10 text-foreground-muted',
    removed: 'bg-destructive/10 text-destructive',
  }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', styles[status])}>
      {status}
    </span>
  )
}

export function InfluencerListTable({
  influencers,
  workspaceCampaigns,
  campaignFilter,
  canEdit,
  workspaceSlug,
  workspaceId,
  page,
  totalCount,
  pageSize,
}: InfluencerListTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [removingCiId, setRemovingCiId] = useState<string | null>(null)

  // ── URL helpers ────────────────────────────────────────────────────────────
  function buildUrl(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else params.delete(k)
    })
    return `${pathname}?${params.toString()}`
  }

  function handleCampaignFilter(campaignId: string) {
    router.push(buildUrl({ campaign: campaignId, page: '1' }))
  }

  function handlePageChange(newPage: number) {
    router.push(buildUrl({ page: String(newPage) }))
  }

  // ── Local search filter ────────────────────────────────────────────────────
  const filtered = influencers.filter((inf) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      inf.ig_handle?.toLowerCase().includes(q) ||
      inf.tiktok_handle?.toLowerCase().includes(q) ||
      inf.youtube_handle?.toLowerCase().includes(q) ||
      getInfluencerLabel(inf).toLowerCase().includes(q)
    )
  })

  // ── Mutations ──────────────────────────────────────────────────────────────
  function handleRemoveFromWorkspace(influencerId: string, label: string) {
    startTransition(async () => {
      const result = await removeInfluencerFromWorkspace(influencerId, workspaceId)
      if (result?.error) { toast.error(result.error); return }
      toast.success(`@${label} removed from workspace`)
    })
  }

  function handleRemoveFromCampaign(campaignInfluencerId: string, campaignName: string) {
    setRemovingCiId(campaignInfluencerId)
    startTransition(async () => {
      const result = await removeInfluencerFromCampaign(campaignInfluencerId)
      setRemovingCiId(null)
      if (result?.error) { toast.error(result.error); return }
      toast.success(`Removed from "${campaignName}"`)
    })
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(totalCount / pageSize)
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  // ── Empty state ────────────────────────────────────────────────────────────
  if (totalCount === 0 && !campaignFilter) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background-muted">
          <Users size={18} className="text-foreground-muted" />
        </div>
        <p className="font-display text-[14px] font-bold text-foreground">No influencers yet</p>
        <p className="max-w-xs text-[13px] text-foreground-lighter">
          Add influencers to your workspace to start tracking their posts.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or handle…"
            className="h-8 w-56 rounded-lg border border-border bg-background-muted pl-8 pr-3 text-[12px] text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>

        {/* Campaign filter */}
        <select
          value={campaignFilter}
          onChange={(e) => handleCampaignFilter(e.target.value)}
          className="h-8 rounded-lg border border-border bg-background-surface px-3 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
        >
          <option value="">All campaigns</option>
          {workspaceCampaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Count */}
        {totalCount > 0 && (
          <span className="text-[12px] text-foreground-lighter">
            Showing {from}–{to} of {totalCount}
          </span>
        )}
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-background-surface">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Influencer
                </th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Platforms
                </th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Campaigns
                </th>
                {canEdit && <th className="w-10 px-3 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 4 : 3} className="px-5 py-12 text-center text-[13px] text-foreground-lighter">
                    {search
                      ? `No influencers match "${search}"`
                      : 'No influencers in this campaign yet'}
                  </td>
                </tr>
              )}

              {filtered.map((inf) => {
                const label = getInfluencerLabel(inf)
                const isExpanded = expandedId === inf.id
                const activeCampaigns = inf.campaigns.filter(c => c.monitoring_status !== 'removed')

                return (
                  <React.Fragment key={inf.id}>
                    {/* ── Main row ── */}
                    <tr className="border-b border-border/50 transition-colors last:border-0 hover:bg-background-muted/30">
                      {/* Influencer cell */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {inf.profile_pic_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={inf.profile_pic_url}
                              alt=""
                              className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand-muted text-[11px] font-bold text-brand">
                              {getInitials(label)}
                            </div>
                          )}
                          <p className="text-[12px] font-medium text-foreground">@{label}</p>
                        </div>
                      </td>

                      {/* Platforms cell — icon badges with handle tooltip */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {inf.ig_handle && (
                            <Tooltip content={`@${inf.ig_handle}`} side="top">
                              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-background-muted">
                                <PlatformIcon platform="instagram" size={13} />
                              </span>
                            </Tooltip>
                          )}
                          {inf.tiktok_handle && (
                            <Tooltip content={`@${inf.tiktok_handle}`} side="top">
                              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-background-muted">
                                <PlatformIcon platform="tiktok" size={13} />
                              </span>
                            </Tooltip>
                          )}
                          {inf.youtube_handle && (
                            <Tooltip content={`@${inf.youtube_handle}`} side="top">
                              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-background-muted">
                                <PlatformIcon platform="youtube" size={13} />
                              </span>
                            </Tooltip>
                          )}
                          {!inf.ig_handle && !inf.tiktok_handle && !inf.youtube_handle && (
                            <span className="text-[12px] text-foreground-muted">—</span>
                          )}
                        </div>
                      </td>

                      {/* Campaigns cell — clickable count badge */}
                      <td className="px-5 py-3">
                        {activeCampaigns.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : inf.id)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/20"
                          >
                            {isExpanded
                              ? <ChevronDown size={11} />
                              : <ChevronRight size={11} />
                            }
                            {activeCampaigns.length}
                          </button>
                        ) : (
                          <span className="text-[12px] text-foreground-muted">0</span>
                        )}
                      </td>

                      {/* Actions cell */}
                      {canEdit && (
                        <td className="px-3 py-3">
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
                                onClick={() => handleRemoveFromWorkspace(inf.id, label)}
                                disabled={isPending}
                              >
                                <Trash2 size={13} />
                                Remove from workspace
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>

                    {/* ── Expanded row ── */}
                    {isExpanded && (
                      <tr className="border-b border-border/50 bg-background-muted/20">
                        <td colSpan={canEdit ? 4 : 3} className="px-5 py-3">
                          <div className="space-y-2">
                            {activeCampaigns.map((c) => (
                              <div key={c.campaign_influencer_id} className="flex items-center gap-3">
                                <Link
                                  href={`/${workspaceSlug}/campaigns/${c.campaign_id}`}
                                  className="flex items-center gap-1.5 text-[12px] font-medium text-foreground hover:text-brand hover:underline"
                                >
                                  {c.name}
                                  <ExternalLink size={11} className="text-foreground-muted" />
                                </Link>
                                <MonitoringBadge status={c.monitoring_status} />
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFromCampaign(c.campaign_influencer_id, c.name)}
                                    disabled={removingCiId === c.campaign_influencer_id}
                                    className="ml-auto text-[11px] text-foreground-muted transition-colors hover:text-destructive disabled:opacity-50"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ─────────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <span className="text-[12px] text-foreground-lighter">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground disabled:opacity-40"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground disabled:opacity-40"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
