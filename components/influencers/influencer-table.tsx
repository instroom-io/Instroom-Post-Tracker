'use client'

import { useState, useTransition } from 'react'
import { MoreHorizontal, Trash2, Users, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { getInitials, getInfluencerLabel } from '@/lib/utils'
import { PlatformIcon } from '@/components/ui/platform-icon'

interface InfluencerRow {
  id: string
  ig_handle: string | null
  tiktok_handle: string | null
  youtube_handle: string | null
  profile_pic_url: string | null
  campaign_count: number
}

interface InfluencerTableProps {
  influencers: InfluencerRow[]
  canEdit: boolean
  onRemove?: (influencerId: string) => Promise<void>
}

type SortKey = 'name' | 'campaign_count'
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown size={12} className="text-foreground-muted" />
  return dir === 'asc'
    ? <ArrowUp size={12} className="text-foreground" />
    : <ArrowDown size={12} className="text-foreground" />
}

export function InfluencerTable({ influencers, canEdit, onRemove }: InfluencerTableProps) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = influencers
    .filter((inf) => {
      const q = search.toLowerCase()
      return (
        getInfluencerLabel(inf).toLowerCase().includes(q) ||
        inf.ig_handle?.toLowerCase().includes(q) ||
        inf.tiktok_handle?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = getInfluencerLabel(a).localeCompare(getInfluencerLabel(b))
      else if (sortKey === 'campaign_count') cmp = a.campaign_count - b.campaign_count
      return sortDir === 'asc' ? cmp : -cmp
    })

  if (influencers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background-muted">
          <Users size={18} className="text-foreground-muted" />
        </div>
        <p className="font-display text-[14px] font-bold text-foreground">No influencers added</p>
        <p className="max-w-xs text-[13px] text-foreground-lighter">
          Add influencers to your workspace to start managing their campaigns.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Search bar */}
      <div className="border-b border-border px-5 py-3">
        <div className="relative max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or handle…"
            className="h-8 w-full rounded-lg border border-border bg-background-muted pl-8 pr-3 text-[12px] text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th
                onClick={() => toggleSort('name')}
                className="cursor-pointer select-none px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted hover:text-foreground"
              >
                <span className="inline-flex items-center gap-1.5">
                  Influencer
                  <SortIcon active={sortKey === 'name'} dir={sortDir} />
                </span>
              </th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                <PlatformIcon platform="instagram" size={14} />
              </th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                <PlatformIcon platform="tiktok" size={14} />
              </th>
              <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                <PlatformIcon platform="youtube" size={14} />
              </th>
              <th
                onClick={() => toggleSort('campaign_count')}
                className="cursor-pointer select-none px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-foreground-muted hover:text-foreground"
              >
                <span className="inline-flex items-center justify-end gap-1.5">
                  Campaigns
                  <SortIcon active={sortKey === 'campaign_count'} dir={sortDir} />
                </span>
              </th>
              {canEdit && <th className="w-10 px-5 py-2.5" />}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={canEdit ? 6 : 5} className="px-5 py-12 text-center text-[13px] text-foreground-lighter">
                  No influencers match &ldquo;{search}&rdquo;
                </td>
              </tr>
            ) : (
              filtered.map((inf) => (
                <tr
                  key={inf.id}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-background-muted/30"
                >
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
                          {getInitials(getInfluencerLabel(inf))}
                        </div>
                      )}
                      <p className="text-[12px] font-medium text-foreground">
                        @{getInfluencerLabel(inf)}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-[12px] text-foreground-lighter">
                    {inf.ig_handle ? `@${inf.ig_handle}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-[12px] text-foreground-lighter">
                    {inf.tiktok_handle ? `@${inf.tiktok_handle}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-[12px] text-foreground-lighter">
                    {inf.youtube_handle ? `@${inf.youtube_handle}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-right text-[12px] text-foreground">
                    {inf.campaign_count}
                  </td>
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
                            onClick={() => {
                              if (!onRemove) return
                              startTransition(async () => {
                                await onRemove(inf.id)
                                toast.success(`@${getInfluencerLabel(inf)} removed`)
                              })
                            }}
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
