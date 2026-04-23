'use client'

import { ChartBar } from '@phosphor-icons/react/dist/ssr'
import { formatPercent } from '@/lib/utils'
import { ER_BENCHMARK_COLORS } from '@/lib/constants/platform-colors'

interface ErData {
  handle: string
  er: number
}

interface ErBenchmarkChartProps {
  data: ErData[]
}

function getDotColor(er: number): string {
  if (er >= 0.08) return 'hsl(145, 72%, 40%)'
  if (er >= 0.04) return ER_BENCHMARK_COLORS.mid
  return ER_BENCHMARK_COLORS.micro
}

export function ErBenchmarkChart({ data }: ErBenchmarkChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background-muted">
          <ChartBar size={16} className="text-foreground-muted" />
        </div>
        <p className="text-[12px] text-foreground-lighter">No engagement rate data available.</p>
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b.er - a.er)
  const maxEr = Math.max(...sorted.map((d) => d.er), 0.10)
  const scale = Math.max(maxEr * 1.2, 0.12)

  const microPct = Math.min((0.04 / scale) * 100, 100)
  const midPct = Math.min(((0.08 - 0.04) / scale) * 100, 100 - microPct)

  return (
    <div>
      {/* Legend */}
      <div className="mb-4 flex items-center gap-5 text-[10px] text-foreground-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: 'hsl(145, 72%, 40%)' }} />
          ≥8% Macro
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: ER_BENCHMARK_COLORS.mid }} />
          ≥4% Mid
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: ER_BENCHMARK_COLORS.micro }} />
          &lt;4% Micro
        </span>
      </div>

      {/* Dot plot rows */}
      <div className="space-y-3">
        {sorted.map((item) => {
          const pct = Math.min((item.er / scale) * 100, 96)
          return (
            <div key={item.handle} className="flex items-center gap-3">
              <span className="w-[70px] shrink-0 truncate text-[11px] text-foreground sm:w-[88px] sm:text-[12px]">
                {item.handle}
              </span>
              <div className="relative flex-1">
                {/* Tier band track */}
                <div className="flex h-1.5 overflow-hidden rounded-full">
                  <div style={{ width: `${microPct}%`, background: `${ER_BENCHMARK_COLORS.micro}28` }} />
                  <div style={{ width: `${midPct}%`, background: `${ER_BENCHMARK_COLORS.mid}28` }} />
                  <div className="flex-1" style={{ background: '#1FAE5B28' }} />
                </div>
                {/* Dot */}
                <div
                  className="absolute h-3 w-3 rounded-full ring-2 ring-background-surface"
                  style={{
                    top: '50%',
                    left: `${pct}%`,
                    transform: 'translate(-50%, -50%)',
                    background: getDotColor(item.er),
                  }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-[12px] font-semibold tabular-nums text-foreground">
                {formatPercent(item.er)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
