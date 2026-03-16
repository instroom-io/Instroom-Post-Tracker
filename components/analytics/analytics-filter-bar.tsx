'use client'

import { Select } from '@/components/ui/select'
import type { Platform } from '@/lib/types'

interface Campaign {
  id: string
  name: string
}

export interface AnalyticsFilters {
  from: string
  to: string
  campaignId: string | 'all'
  platform: Platform | 'all'
}

interface AnalyticsFilterBarProps {
  filters: AnalyticsFilters
  onFilterChange: (filters: AnalyticsFilters) => void
  campaigns: Campaign[]
}

export function AnalyticsFilterBar({
  filters,
  onFilterChange,
  campaigns,
}: AnalyticsFilterBarProps) {
  function update<K extends keyof AnalyticsFilters>(
    key: K,
    value: AnalyticsFilters[K]
  ) {
    onFilterChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-[11px] font-medium text-foreground-muted uppercase tracking-wider">
          From
        </label>
        <input
          type="date"
          value={filters.from}
          onChange={(e) => update('from', e.target.value)}
          className="h-9 rounded-lg border border-border bg-background-surface px-3 text-[12px] text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[11px] font-medium text-foreground-muted uppercase tracking-wider">
          To
        </label>
        <input
          type="date"
          value={filters.to}
          onChange={(e) => update('to', e.target.value)}
          className="h-9 rounded-lg border border-border bg-background-surface px-3 text-[12px] text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <div className="w-44">
        <Select
          value={filters.campaignId}
          onChange={(e) => update('campaignId', e.target.value)}
          options={[
            { value: 'all', label: 'All campaigns' },
            ...campaigns.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      </div>

      <div className="w-36">
        <Select
          value={filters.platform}
          onChange={(e) =>
            update('platform', e.target.value as AnalyticsFilters['platform'])
          }
          options={[
            { value: 'all', label: 'All platforms' },
            { value: 'instagram', label: 'Instagram' },
            { value: 'tiktok', label: 'TikTok' },
            { value: 'youtube', label: 'YouTube' },
          ]}
        />
      </div>
    </div>
  )
}
