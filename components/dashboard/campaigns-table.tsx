'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Megaphone,
  MagnifyingGlass,
  ArrowsDownUp,
  ArrowUp,
  ArrowDown,
  DotsThree,
  ArrowCounterClockwise,
  Eye,
  EyeSlash,
} from '@phosphor-icons/react'
import Lottie, { type LottieRefCurrentProps } from 'lottie-react'
import archiveAnim from 'react-useanimations/lib/archive'
import trashAnim   from 'react-useanimations/lib/trash2'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { AnimatedBadge } from '@/components/ui/animated-badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { archiveCampaign, restoreCampaign, deleteCampaign } from '@/lib/actions/campaigns'
import { formatDateRange, cn } from '@/lib/utils'
import type { CampaignStatus, WorkspaceRole } from '@/lib/types'

interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  start_date: string
  end_date: string | null
  post_count: number
}

interface CampaignsTableProps {
  campaigns: Campaign[]
  workspaceSlug: string
  workspaceId: string
  userRole: WorkspaceRole
}

const statusVariant: Record<CampaignStatus, 'active' | 'draft' | 'ended'> = {
  active: 'active',
  draft: 'draft',
  ended: 'ended',
  archived: 'ended',
}

type SortKey = 'name' | 'status' | 'post_count' | 'start_date'
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowsDownUp size={12} className="text-foreground-muted" />
  return dir === 'asc'
    ? <ArrowUp size={12} className="text-foreground" />
    : <ArrowDown size={12} className="text-foreground" />
}

interface CampaignRowActionsProps {
  campaign: { id: string; name: string; status: CampaignStatus; post_count: number }
  onArchive: (id: string) => void
  onRestore: (id: string) => void
  onDelete: (id: string, name: string) => void
}

function CampaignRowActions({ campaign, onArchive, onRestore, onDelete }: CampaignRowActionsProps) {
  const archiveRef = useRef<LottieRefCurrentProps>(null)
  const trashRef   = useRef<LottieRefCurrentProps>(null)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${campaign.name}`}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background-surface text-foreground-light shadow-sm opacity-0 transition-all group-hover:opacity-100 hover:bg-background-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <DotsThree size={16} weight="bold" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {campaign.status !== 'archived' ? (
          <DropdownMenuItem
            onClick={() => onArchive(campaign.id)}
            onMouseEnter={() => archiveRef.current?.goToAndPlay(0, true)}
            onMouseLeave={() => archiveRef.current?.stop()}
          >
            <div className="[filter:brightness(0)_opacity(0.5)] dark:[filter:brightness(0)_invert(1)_opacity(0.5)]">
              <Lottie lottieRef={archiveRef} animationData={archiveAnim.animationData} loop={false} autoplay={false} style={{ width: 15, height: 15 }} />
            </div>
            Archive
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onRestore(campaign.id)}>
            <ArrowCounterClockwise size={14} />
            Restore
          </DropdownMenuItem>
        )}
        {(campaign.post_count === 0 || campaign.status === 'archived') && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(campaign.id, campaign.name)}
              onMouseEnter={() => trashRef.current?.goToAndPlay(0, true)}
              onMouseLeave={() => trashRef.current?.stop()}
            >
              <div className="[filter:brightness(0)_saturate(100%)_invert(27%)_sepia(89%)_saturate(1167%)_hue-rotate(333deg)_brightness(92%)_contrast(92%)]">
                <Lottie lottieRef={trashRef} animationData={trashAnim.animationData} loop={false} autoplay={false} style={{ width: 15, height: 15 }} />
              </div>
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function CampaignsTable({ campaigns, workspaceSlug, workspaceId, userRole }: CampaignsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('start_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [showArchived, setShowArchived] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const showActions = ['owner', 'admin', 'editor'].includes(userRole)

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  function handleArchive(campaignId: string) {
    startTransition(async () => {
      const result = await archiveCampaign(workspaceId, campaignId)
      if (result?.error) toast.error(result.error)
    })
  }

  function handleRestore(campaignId: string) {
    startTransition(async () => {
      const result = await restoreCampaign(workspaceId, campaignId)
      if (result?.error) toast.error(result.error)
    })
  }

  function handleDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await deleteCampaign(workspaceId, deleteTarget.id)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setDeleteTarget(null)
      }
    })
  }

  const filtered = campaigns
    .filter((c) => showArchived || c.status !== 'archived')
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortKey === 'status') cmp = a.status.localeCompare(b.status)
      else if (sortKey === 'post_count') cmp = a.post_count - b.post_count
      else if (sortKey === 'start_date') cmp = (a.start_date ?? '').localeCompare(b.start_date ?? '')
      return sortDir === 'asc' ? cmp : -cmp
    })

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background-muted">
          <Megaphone size={18} className="text-foreground-muted" />
        </div>
        <p className="font-display text-[14px] font-bold text-foreground">No campaigns yet</p>
        <p className="max-w-xs text-[13px] text-foreground-lighter">
          Create your first campaign to start tracking influencer posts.
        </p>
      </div>
    )
  }

  return (
    <>
      <div>
        {/* Search bar + Show archived toggle */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 border-b border-border px-5 py-3">
          <div className="relative w-full sm:max-w-xs">
            <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns…"
              aria-label="Search campaigns"
              className="h-8 w-full rounded-lg border border-border bg-background-muted pl-8 pr-3 text-[12px] text-foreground placeholder:text-foreground-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] transition-colors',
              showArchived
                ? 'bg-background-muted text-foreground'
                : 'text-foreground-muted hover:text-foreground'
            )}
          >
            {showArchived ? <EyeSlash size={13} /> : <Eye size={13} />}
            {showArchived ? 'Hide archived' : 'Show archived'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">Campaigns list</caption>
            <thead>
              <tr className="border-b border-border">
                <th
                  scope="col"
                  onClick={() => toggleSort('name')}
                  className="cursor-pointer select-none px-5 py-3 text-left text-[11px] font-medium text-foreground-lighter hover:text-foreground"
                >
                  <span className="inline-flex items-center gap-1.5">
                    Campaign
                    <SortIcon active={sortKey === 'name'} dir={sortDir} />
                  </span>
                </th>
                <th
                  scope="col"
                  onClick={() => toggleSort('status')}
                  className="cursor-pointer select-none px-5 py-3 text-left text-[11px] font-medium text-foreground-lighter hover:text-foreground"
                >
                  <span className="inline-flex items-center gap-1.5">
                    Status
                    <SortIcon active={sortKey === 'status'} dir={sortDir} />
                  </span>
                </th>
                <th
                  scope="col"
                  onClick={() => toggleSort('post_count')}
                  className="cursor-pointer select-none px-5 py-3 text-right text-[11px] font-medium text-foreground-lighter hover:text-foreground"
                >
                  <span className="inline-flex items-center justify-end gap-1.5">
                    Posts
                    <SortIcon active={sortKey === 'post_count'} dir={sortDir} />
                  </span>
                </th>
                <th
                  scope="col"
                  onClick={() => toggleSort('start_date')}
                  className="cursor-pointer select-none px-5 py-3 text-left text-[11px] font-medium text-foreground-lighter hover:text-foreground"
                >
                  <span className="inline-flex items-center gap-1.5">
                    Date range
                    <SortIcon active={sortKey === 'start_date'} dir={sortDir} />
                  </span>
                </th>
                {showActions && <th scope="col" className="w-10 px-3 py-3" />}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={showActions ? 5 : 4}
                    className="px-5 py-12 text-center text-[13px] text-foreground-lighter"
                  >
                    {search
                      ? `No campaigns match "${search}"`
                      : 'No archived campaigns'}
                  </td>
                </tr>
              ) : (
                filtered.map((campaign) => (
                  <tr
                    key={campaign.id}
                    tabIndex={0}
                    onClick={() => router.push(`/${workspaceSlug}/campaigns/${campaign.id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/${workspaceSlug}/campaigns/${campaign.id}`) } }}
                    className={cn(
                      'group border-b border-border/50 transition-colors last:border-0 hover:bg-background-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40',
                      campaign.status === 'archived' && 'opacity-50'
                    )}
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-[12px] font-medium text-foreground">
                        {campaign.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {campaign.status === 'active' ? (
                        <AnimatedBadge className="capitalize">{campaign.status}</AnimatedBadge>
                      ) : (
                        <Badge variant={statusVariant[campaign.status]} className="capitalize">
                          {campaign.status}
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-[12px] font-medium text-foreground">
                      {campaign.post_count}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-foreground-lighter">
                      {formatDateRange(campaign.start_date, campaign.end_date)}
                    </td>
                    {showActions && (
                      <td className="px-3 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <CampaignRowActions
                          campaign={campaign}
                          onArchive={handleArchive}
                          onRestore={handleRestore}
                          onDelete={(id, name) => setDeleteTarget({ id, name })}
                        />
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete campaign?</DialogTitle>
            <DialogDescription>
              <strong>{deleteTarget?.name}</strong> will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              loading={isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
