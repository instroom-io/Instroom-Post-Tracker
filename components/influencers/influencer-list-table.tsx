'use client'

import React, { useState, useTransition } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  CaretRight,
  DotsThree,
  Trash,
  MagnifyingGlass,
  Users,
  ArrowSquareOut,
  CaretLeft,
  FolderPlus,
  X,
} from '@phosphor-icons/react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PlatformIcon } from '@/components/ui/platform-icon'
import { Tooltip } from '@/components/ui/tooltip'
import { removeInfluencerFromWorkspace, removeInfluencerFromCampaign, addInfluencerToCampaign } from '@/lib/actions/influencers'
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

const STATUS_DOT: Record<MonitoringStatus, string> = {
  active:  'bg-brand',
  pending: 'bg-warning',
  paused:  'bg-foreground-muted/50',
  removed: 'bg-destructive',
  stopped: 'bg-foreground-muted/50',
}

const STATUS_LABEL: Record<MonitoringStatus, string> = {
  active:  'text-brand',
  pending: 'text-warning',
  paused:  'text-foreground-muted',
  removed: 'text-destructive',
  stopped: 'text-foreground-muted',
}

function MonitoringBadge({ status }: { status: MonitoringStatus }) {
  const styles: Record<MonitoringStatus, string> = {
    active:  'bg-brand/10 text-brand',
    pending: 'bg-warning/10 text-warning',
    paused:  'bg-foreground-muted/10 text-foreground-muted',
    removed: 'bg-destructive/10 text-destructive',
    stopped: 'bg-foreground-muted/10 text-foreground-muted',
  }
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide', styles[status])}>
      {status}
    </span>
  )
}

interface CampaignCardProps {
  entry: CampaignEntry
  workspaceSlug: string
  canEdit: boolean
  isRemoving: boolean
  influencerLabel: string
  onRequestRemove: (ciId: string, campaignName: string, influencerLabel: string) => void
}

function CampaignCard({ entry, workspaceSlug, canEdit, isRemoving, influencerLabel, onRequestRemove }: CampaignCardProps) {
  return (
    <div
      className={cn(
        'group flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-background-muted/50',
        isRemoving && 'opacity-40'
      )}
    >
      {/* Status dot */}
      <div
        className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', STATUS_DOT[entry.monitoring_status])}
        aria-hidden="true"
      />
      {/* Campaign name */}
      <Link
        href={`/${workspaceSlug}/campaigns/${entry.campaign_id}`}
        className="flex min-w-0 flex-1 items-center gap-1 text-[12px] font-medium text-foreground-light transition-colors hover:text-foreground"
      >
        <span className="truncate">{entry.name}</span>
        <ArrowSquareOut
          size={9}
          className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-40"
        />
      </Link>
      {/* Status label */}
      <span className={cn('flex-shrink-0 text-[11px] font-medium capitalize', STATUS_LABEL[entry.monitoring_status])}>
        {entry.monitoring_status}
      </span>
      {/* Remove icon — appears on hover */}
      {canEdit && (
        <Tooltip content={`Remove @${influencerLabel} from "${entry.name}"`} side="top">
          <button
            type="button"
            onClick={() => onRequestRemove(entry.campaign_influencer_id, entry.name, influencerLabel)}
            disabled={isRemoving}
            aria-label={`Remove from ${entry.name}`}
            className="ml-0.5 flex-shrink-0 rounded p-0.5 text-foreground-muted opacity-0 transition-all group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 disabled:cursor-not-allowed"
          >
            <X size={12} />
          </button>
        </Tooltip>
      )}
    </div>
  )
}

interface CampaignExpansionPanelProps {
  campaigns: CampaignEntry[]
  workspaceSlug: string
  canEdit: boolean
  removingCiId: string | null
  influencerLabel: string
  onRequestRemove: (ciId: string, campaignName: string, influencerLabel: string) => void
}

function CampaignExpansionPanel({ campaigns, workspaceSlug, canEdit, removingCiId, influencerLabel, onRequestRemove }: CampaignExpansionPanelProps) {
  const shouldReduceMotion = useReducedMotion()
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      className="overflow-hidden"
    >
      <div className="border-t border-border/40 py-2 pl-[52px] pr-3">
        {campaigns.map((c) => (
          <CampaignCard
            key={c.campaign_influencer_id}
            entry={c}
            workspaceSlug={workspaceSlug}
            canEdit={canEdit}
            isRemoving={removingCiId === c.campaign_influencer_id}
            influencerLabel={influencerLabel}
            onRequestRemove={onRequestRemove}
          />
        ))}
      </div>
    </motion.div>
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

  // Remove from workspace confirmation state
  const [removeConfirmInfluencer, setRemoveConfirmInfluencer] = useState<{ id: string; label: string; campaigns: CampaignEntry[] } | null>(null)

  // Remove from campaign confirmation state
  const [removeCampaignConfirm, setRemoveCampaignConfirm] = useState<{ ciId: string; campaignName: string; influencerLabel: string } | null>(null)

  // Add to campaign dialog state
  const [addToCampaignInfluencer, setAddToCampaignInfluencer] = useState<InfluencerWithCampaigns | null>(null)
  const [addCampaignId, setAddCampaignId] = useState('')
  const [addProductSentAt, setAddProductSentAt] = useState('')
  const [isAddingToCampaign, startAddTransition] = useTransition()

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
  function handleRemoveFromWorkspace() {
    if (!removeConfirmInfluencer) return
    const { id, label } = removeConfirmInfluencer
    setRemoveConfirmInfluencer(null)
    startTransition(async () => {
      const result = await removeInfluencerFromWorkspace(id, workspaceId)
      if (result?.error) { toast.error(result.error); return }
      toast.success(`@${label} removed from workspace`)
    })
  }

  function handleAddToCampaign() {
    if (!addToCampaignInfluencer || !addCampaignId) return
    startAddTransition(async () => {
      const result = await addInfluencerToCampaign(workspaceId, addCampaignId, addToCampaignInfluencer.id, addProductSentAt || null)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Added to campaign')
      setAddToCampaignInfluencer(null)
    })
  }

  function confirmRemoveFromCampaign() {
    if (!removeCampaignConfirm) return
    const { ciId, campaignName } = removeCampaignConfirm
    setRemoveCampaignConfirm(null)
    setRemovingCiId(ciId)
    startTransition(async () => {
      const result = await removeInfluencerFromCampaign(ciId)
      setRemovingCiId(null)
      if (result?.error) { toast.error(result.error); return }
      toast.success(`Removed from "${campaignName}"`)
    })
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const activeCampaignName = campaignFilter
    ? workspaceCampaigns.find((c) => c.id === campaignFilter)?.name ?? null
    : null

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(totalCount / pageSize)
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  // ── Empty state ────────────────────────────────────────────────────────────
  if (totalCount === 0 && !campaignFilter) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-background-muted">
          <Users size={20} className="text-foreground-muted" />
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {/* Left group: search + campaign filter + active chip */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="flex flex-col gap-0">
            <div className="relative">
              <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or handle…"
                className="h-9 w-64 rounded-lg border border-border bg-background-muted pl-8 pr-3 text-[12px] text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-brand/40"
              />
            </div>
            {search && (
              <span className="pl-1 pt-0.5 text-[11px] italic text-foreground-muted">Searching this page only</span>
            )}
          </div>

          {/* Campaign filter */}
          <select
            value={campaignFilter}
            onChange={(e) => handleCampaignFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background-surface px-3 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
          >
            <option value="">All campaigns</option>
            {workspaceCampaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Active filter chip */}
          {activeCampaignName && (
            <button
              type="button"
              onClick={() => handleCampaignFilter('')}
              className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-medium text-brand transition-colors hover:bg-brand/20"
            >
              {activeCampaignName}
              <X size={10} />
            </button>
          )}
        </div>

        {/* Right: count */}
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
              <tr className="border-b border-border bg-background-muted/40">
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-lighter">
                  Influencer
                </th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-lighter">
                  Platforms
                </th>
                <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground-lighter">
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
                      : campaignFilter
                        ? 'No influencers in this campaign'
                        : 'No influencers yet'}
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
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {inf.profile_pic_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={inf.profile_pic_url}
                              alt=""
                              className="h-9 w-9 flex-shrink-0 rounded-full object-cover ring-1 ring-border"
                            />
                          ) : (
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-muted to-brand/20 text-[11px] font-bold text-brand ring-1 ring-border">
                              {getInitials(label)}
                            </div>
                          )}
                          <p className="text-[13px] font-semibold text-foreground">@{label}</p>
                        </div>
                      </td>

                      {/* Platforms cell — icon badges with handle tooltip */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {inf.ig_handle && (
                            <Tooltip content={`@${inf.ig_handle}`} side="top">
                              <span className="flex h-6 w-6 cursor-help items-center justify-center rounded-md bg-purple-50 dark:bg-purple-500/10">
                                <PlatformIcon platform="instagram" size={13} />
                              </span>
                            </Tooltip>
                          )}
                          {inf.tiktok_handle && (
                            <Tooltip content={`@${inf.tiktok_handle}`} side="top">
                              <span className="flex h-6 w-6 cursor-help items-center justify-center rounded-md bg-blue-50 dark:bg-blue-500/10">
                                <PlatformIcon platform="tiktok" size={13} />
                              </span>
                            </Tooltip>
                          )}
                          {inf.youtube_handle && (
                            <Tooltip content={`@${inf.youtube_handle}`} side="top">
                              <span className="flex h-6 w-6 cursor-help items-center justify-center rounded-md bg-red-50 dark:bg-red-500/10">
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
                      <td className="px-5 py-3.5">
                        {activeCampaigns.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : inf.id)}
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} campaigns`}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5',
                              'text-[11px] font-semibold transition-colors',
                              'bg-accent/10 text-accent hover:bg-accent/20',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                              isExpanded && 'bg-accent/20 ring-1 ring-accent/30'
                            )}
                          >
                            <motion.span
                              animate={{ rotate: isExpanded ? 90 : 0 }}
                              transition={{ duration: 0.2, ease: 'easeInOut' }}
                              className="flex"
                            >
                              <CaretRight size={11} />
                            </motion.span>
                            {activeCampaigns.length}
                          </button>
                        ) : (
                          <span className="text-[12px] text-foreground-muted">—</span>
                        )}
                      </td>

                      {/* Actions cell */}
                      {canEdit && (
                        <td className="px-3 py-3.5">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="cursor-pointer rounded-md p-1.5 text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground"
                              >
                                <DotsThree size={15} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setAddToCampaignInfluencer(inf)
                                  setAddCampaignId('')
                                  setAddProductSentAt('')
                                }}
                              >
                                <FolderPlus size={13} />
                                Add to campaign
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => setRemoveConfirmInfluencer({ id: inf.id, label, campaigns: activeCampaigns })}
                              >
                                <Trash size={13} />
                                Remove from workspace
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>

                    {/* ── Expanded row ── */}
                    <AnimatePresence initial={false}>
                      {isExpanded && activeCampaigns.length > 0 && (
                        <tr key={`${inf.id}-exp`}>
                          <td colSpan={canEdit ? 4 : 3} className="border-b border-border/50 p-0">
                            <CampaignExpansionPanel
                              campaigns={activeCampaigns}
                              workspaceSlug={workspaceSlug}
                              canEdit={canEdit}
                              removingCiId={removingCiId}
                              influencerLabel={label}
                              onRequestRemove={(ciId, campaignName, influencerLabel) =>
                                setRemoveCampaignConfirm({ ciId, campaignName, influencerLabel })
                              }
                            />
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
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
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground disabled:opacity-40"
              >
                <CaretLeft size={13} />
              </button>
              {totalPages > 2 && (() => {
                const half = 2
                let start = Math.max(1, page - half)
                const end = Math.min(totalPages, start + 4)
                start = Math.max(1, end - 4)
                return Array.from({ length: end - start + 1 }, (_, i) => {
                  const p = start + i
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePageChange(p)}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-md text-[12px] transition-colors',
                        page === p
                          ? 'bg-brand/10 font-semibold text-brand'
                          : 'text-foreground-muted hover:bg-background-muted hover:text-foreground'
                      )}
                    >
                      {p}
                    </button>
                  )
                })
              })()}
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground disabled:opacity-40"
              >
                <CaretRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Remove from workspace confirmation dialog */}
      <Dialog
        open={!!removeConfirmInfluencer}
        onOpenChange={(v) => { if (!v) setRemoveConfirmInfluencer(null) }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Remove from workspace?</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-[13px] text-foreground-light">
              <span className="font-medium text-foreground">@{removeConfirmInfluencer?.label}</span> will be permanently removed from this workspace. This cannot be undone.
            </p>
            <ul className="space-y-1.5 text-[12px] text-foreground-light">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-destructive">•</span>
                Removed from all campaigns immediately
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-destructive">•</span>
                All scraped posts and performance data will be deleted
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-destructive">•</span>
                Post monitoring will stop and cannot be recovered
              </li>
            </ul>
            {removeConfirmInfluencer && removeConfirmInfluencer.campaigns.length > 0 && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-destructive/70">
                  Active in {removeConfirmInfluencer.campaigns.length} campaign{removeConfirmInfluencer.campaigns.length !== 1 ? 's' : ''}
                </p>
                <ul className="space-y-0.5">
                  {removeConfirmInfluencer.campaigns.map((c) => (
                    <li key={c.campaign_id} className="text-[12px] text-foreground-light">
                      {c.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" size="md" onClick={() => setRemoveConfirmInfluencer(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="md"
              loading={isPending}
              onClick={handleRemoveFromWorkspace}
            >
              Remove influencer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove from campaign confirmation dialog */}
      <Dialog
        open={!!removeCampaignConfirm}
        onOpenChange={(v) => { if (!v) setRemoveCampaignConfirm(null) }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Remove from campaign?</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-3">
            <p className="text-[13px] text-foreground-light">
              <span className="font-medium text-foreground">@{removeCampaignConfirm?.influencerLabel}</span> will be removed from{' '}
              <span className="font-medium text-foreground">{removeCampaignConfirm?.campaignName}</span>.
            </p>
            <ul className="space-y-1.5 text-[12px] text-foreground-light">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-destructive">•</span>
                Post monitoring for this campaign will stop immediately
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-destructive">•</span>
                Posts already scraped for this campaign will be deleted
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-foreground-muted">•</span>
                The influencer stays in your workspace and other campaigns
              </li>
            </ul>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" size="md" onClick={() => setRemoveCampaignConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="md"
              loading={isPending}
              onClick={confirmRemoveFromCampaign}
            >
              Remove from campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to campaign dialog */}
      {(() => {
        const alreadyInCampaignIds = new Set(addToCampaignInfluencer?.campaigns.map(c => c.campaign_id) ?? [])
        const availableCampaigns = workspaceCampaigns.filter(c => !alreadyInCampaignIds.has(c.id))
        return (
          <Dialog
            open={!!addToCampaignInfluencer}
            onOpenChange={(v) => { if (!v) setAddToCampaignInfluencer(null) }}
          >
            <DialogContent size="sm">
              <DialogHeader>
                <DialogTitle>{availableCampaigns.length === 0 ? 'Manage campaigns' : 'Add to campaign'}</DialogTitle>
              </DialogHeader>
              <DialogBody className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                    Campaign
                  </label>
                  {availableCampaigns.length === 0 ? (
                    <p className="text-[12px] text-foreground-lighter">
                      This influencer is already in all campaigns.
                    </p>
                  ) : (
                    <select
                      value={addCampaignId}
                      onChange={(e) => setAddCampaignId(e.target.value)}
                      className="h-9 w-full rounded-lg border border-border bg-background-surface px-3 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
                    >
                      <option value="">Select a campaign</option>
                      {availableCampaigns.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                    Product sent date <span className="normal-case text-foreground-subtle">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={addProductSentAt}
                    onChange={(e) => setAddProductSentAt(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40"
                  />
                  <p className="text-[11px] text-foreground-subtle">
                    When the product was sent. Used to set the start date for post detection.
                  </p>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="secondary" size="md" onClick={() => setAddToCampaignInfluencer(null)}>
                  {availableCampaigns.length === 0 ? 'Close' : 'Cancel'}
                </Button>
                {availableCampaigns.length > 0 && (
                  <Button
                    variant="primary"
                    size="md"
                    disabled={!addCampaignId}
                    loading={isAddingToCampaign}
                    onClick={handleAddToCampaign}
                  >
                    Add to campaign
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      })()}
    </div>
  )
}
