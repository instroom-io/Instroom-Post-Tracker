'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Megaphone, MagnifyingGlass, ArrowsDownUp, ArrowUp, ArrowDown } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { AnimatedBadge } from '@/components/ui/animated-badge'
import { formatDateRange } from '@/lib/utils'
import type { CampaignStatus } from '@/lib/types'

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
}

const statusVariant: Record<CampaignStatus, 'active' | 'draft' | 'ended'> = {
  active: 'active',
  draft: 'draft',
  ended: 'ended',
}

type SortKey = 'name' | 'status' | 'post_count' | 'start_date'
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowsDownUp size={12} className="text-foreground-muted" />
  return dir === 'asc'
    ? <ArrowUp size={12} className="text-foreground" />
    : <ArrowDown size={12} className="text-foreground" />
}

export function CampaignsTable({ campaigns, workspaceSlug }: CampaignsTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('start_date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = campaigns
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
    <div>
      {/* Search bar */}
      <div className="border-b border-border px-5 py-3">
        <div className="relative max-w-xs">
          <MagnifyingGlass size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns…"
            className="h-8 w-full rounded-lg border border-border bg-background-muted pl-8 pr-3 text-[12px] text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th
                scope="col"
                onClick={() => toggleSort('name')}
                className="cursor-pointer select-none px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted hover:text-foreground"
              >
                <span className="inline-flex items-center gap-1.5">
                  Campaign
                  <SortIcon active={sortKey === 'name'} dir={sortDir} />
                </span>
              </th>
              <th
                scope="col"
                onClick={() => toggleSort('status')}
                className="cursor-pointer select-none px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted hover:text-foreground"
              >
                <span className="inline-flex items-center gap-1.5">
                  Status
                  <SortIcon active={sortKey === 'status'} dir={sortDir} />
                </span>
              </th>
              <th
                scope="col"
                onClick={() => toggleSort('post_count')}
                className="cursor-pointer select-none px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-muted hover:text-foreground"
              >
                <span className="inline-flex items-center justify-end gap-1.5">
                  Posts
                  <SortIcon active={sortKey === 'post_count'} dir={sortDir} />
                </span>
              </th>
              <th
                scope="col"
                onClick={() => toggleSort('start_date')}
                className="cursor-pointer select-none px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-muted hover:text-foreground"
              >
                <span className="inline-flex items-center gap-1.5">
                  Date range
                  <SortIcon active={sortKey === 'start_date'} dir={sortDir} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-[13px] text-foreground-lighter">
                  No campaigns match &ldquo;{search}&rdquo;
                </td>
              </tr>
            ) : (
              filtered.map((campaign) => (
                <tr
                  key={campaign.id}
                  onClick={() => router.push(`/${workspaceSlug}/campaigns/${campaign.id}`)}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-background-muted/40 cursor-pointer"
                >
                  <td className="px-5 py-3.5">
                    <span className="text-[12px] font-medium text-foreground">
                      {campaign.name}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {campaign.status === 'active' ? (
                      <AnimatedBadge>{campaign.status}</AnimatedBadge>
                    ) : (
                      <Badge variant={statusVariant[campaign.status]}>
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
