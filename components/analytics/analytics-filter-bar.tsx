'use client'

import { useState, useRef, useEffect } from 'react'
import { CalendarDots, Funnel, Check, CaretDown } from '@phosphor-icons/react'
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

function DateRangeFilter({
  filters,
  onFilterChange,
}: {
  filters: AnalyticsFilters
  onFilterChange: (f: AnalyticsFilters) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click or Escape — the panel is inside ref so date
  // input interactions won't accidentally trigger this.
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', onMouseDown)
      document.addEventListener('keydown', onKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const activePreset =
    PRESETS.find((p) => {
      const r = p.getValue()
      return r.from === filters.from && r.to === filters.to
    })?.label ?? 'Custom'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background-surface px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-background-muted',
          open && 'border-brand ring-2 ring-brand/20'
        )}
      >
        <Funnel size={13} className="text-foreground-muted" />
        <span>{activePreset}</span>
        <CaretDown
          size={10}
          className={cn(
            'text-foreground-muted transition-transform duration-150',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-52 rounded-xl border border-border bg-background-surface shadow-md">
          <div className="p-1">
            <div className="px-3 py-1.5 text-[11px] font-semibold text-foreground-muted">
              Date range
            </div>

            {PRESETS.map((p) => {
              const isActive = activePreset === p.label
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    onFilterChange({ ...filters, ...p.getValue() })
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-[12px] text-foreground transition-colors hover:bg-background-muted"
                >
                  <span className="flex-1 text-left">{p.label}</span>
                  {isActive && <Check size={12} weight="bold" className="text-brand" />}
                </button>
              )
            })}

            <div className="-mx-1 my-1 border-t border-border" />

            <div className="px-3 py-1.5 text-[11px] font-semibold text-foreground-muted">
              Custom range
            </div>
            <div className="space-y-1.5 px-2 pb-2">
              <div className="relative">
                <CalendarDots
                  size={12}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted"
                />
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => onFilterChange({ ...filters, from: e.target.value })}
                  aria-label="From date"
                  className="h-8 w-full rounded-lg border border-border bg-background-surface pl-8 pr-3 text-[11px] text-foreground [color-scheme:light] dark:[color-scheme:dark] focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
                />
              </div>
              <div className="relative">
                <CalendarDots
                  size={12}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted"
                />
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => onFilterChange({ ...filters, to: e.target.value })}
                  aria-label="To date"
                  className="h-8 w-full rounded-lg border border-border bg-background-surface pl-8 pr-3 text-[11px] text-foreground [color-scheme:light] dark:[color-scheme:dark] focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function AnalyticsFilterBar({
  filters,
  onFilterChange,
  campaigns,
}: AnalyticsFilterBarProps) {
  function update<K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) {
    onFilterChange({ ...filters, [key]: value })
  }

  return (
    <div className="rounded-xl border border-border bg-background-surface p-4 shadow-xs">
      <div className="flex flex-wrap items-center gap-3">
        <DateRangeFilter filters={filters} onFilterChange={onFilterChange} />

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
