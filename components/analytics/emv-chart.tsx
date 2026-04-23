'use client'

import { TrendUp } from '@phosphor-icons/react/dist/ssr'
import { formatEMV } from '@/lib/utils'

interface EmvData {
  handle: string
  emv: number
}

interface EmvChartProps {
  data: EmvData[]
}

export function EmvChart({ data }: EmvChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background-muted">
          <TrendUp size={16} className="text-foreground-muted" />
        </div>
        <p className="text-[12px] text-foreground-lighter">No EMV data available.</p>
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b.emv - a.emv).slice(0, 10)
  const maxEmv = sorted[0]?.emv ?? 1

  return (
    <div className="space-y-2.5">
      {sorted.map((item, i) => (
        <div key={item.handle} className="flex items-center gap-3">
          <span className="w-4 shrink-0 text-right text-[11px] tabular-nums text-foreground-muted">
            {i + 1}
          </span>
          <span className="w-16 shrink-0 truncate text-[11px] text-foreground sm:w-20 sm:text-[12px]">
            {item.handle}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-background-muted">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${Math.max((item.emv / maxEmv) * 100, 2)}%` }}
            />
          </div>
          <span className="w-14 shrink-0 text-right text-[12px] font-semibold tabular-nums text-foreground">
            {formatEMV(item.emv)}
          </span>
        </div>
      ))}
    </div>
  )
}
