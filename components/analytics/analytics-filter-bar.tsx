'use client'

import { CalendarDots } from '@phosphor-icons/react'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
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

function toLocalDate(d: Date): string {
  return d.toLocaleDateString('en-CA')
}

const PRESETS = [
  {
    label: 'Last 7d',
    getValue: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 6)
      return { from: toLocalDate(from), to: toLocalDate(to) }
    },
  },
  {
    label: 'Last 30d',
    getValue: () => {
      const to = new Date()
      const from = new Date()
      from.setDate(from.getDate() - 29)
      return { from: toLocalDate(from), to: toLocalDate(to) }
    },
  },
  {
    label: 'MTD',
    getValue: () => {
      const to = new Date()
      const from = new Date(to.getFullYear(), to.getMonth(), 1)
      return { from: toLocalDate(from), to: toLocalDate(to) }
    },
  },
  {
    label: 'Last 3M',
    getValue: () => {
      const to = new Date()
      const from = new Date()
      from.setMonth(from.getMonth() - 3)
      return { from: toLocalDate(from), to: toLocalDate(to) }
    },
  },
  {
    label: 'YTD',
    getValue: () => {
      const to = new Date()
      const from = new Date(to.getFullYear(), 0, 1)
      return { from: toLocalDate(from), to: toLocalDate(to) }
    },
  },
  {
    label: 'All time',
    getValue: () => ({ from: '', to: '' }),
  },
]

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

  const activePreset =
    PRESETS.find((p) => {
      const range = p.getValue()
      return range.from === filters.from && range.to === filters.to
    })?.label ?? null

  return (
    <div className="rounded-xl border border-border bg-background-surface p-4 shadow-xs">
      {/* Preset shortcuts */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const isActive = activePreset === p.label
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onFilterChange({ ...filters, ...p.getValue() })}
              className={cn(
                'h-7 rounded-md px-2.5 text-[11px] font-medium transition-colors',
                isActive
                  ? 'bg-brand text-white'
                  : 'border border-border bg-background-surface text-foreground-muted hover:bg-background-muted hover:text-foreground'
              )}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {/* Date inputs + dropdowns */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-auto">
          <CalendarDots size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            type="date"
            value={filters.from}
            onChange={(e) => update('from', e.target.value)}
            aria-label="From date"
            className="h-9 w-full rounded-lg border border-border bg-background-surface pl-8 pr-3 text-[12px] text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <span className="hidden sm:inline text-[11px] text-foreground-muted">to</span>

        <div className="relative w-full sm:w-auto">
          <CalendarDots size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            type="date"
            value={filters.to}
            onChange={(e) => update('to', e.target.value)}
            aria-label="To date"
            className="h-9 w-full rounded-lg border border-border bg-background-surface pl-8 pr-3 text-[12px] text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>

        <div className="w-full sm:w-44">
          <Select
            value={filters.campaignId}
            onChange={(e) => update('campaignId', e.target.value)}
            options={[
              { value: 'all', label: 'All campaigns' },
              ...campaigns.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>

        <div className="w-full sm:w-36">
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
    </div>
  )
}
