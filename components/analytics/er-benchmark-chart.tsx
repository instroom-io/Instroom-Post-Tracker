'use client'

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { formatPercent } from '@/lib/utils'
import { CHART_COLORS, ER_BENCHMARK_COLORS } from '@/lib/constants/platform-colors'

interface ErData {
  handle: string
  er: number
}

interface ErBenchmarkChartProps {
  data: ErData[]
}

function getBarColor(er: number): string {
  if (er >= 0.08) return 'hsl(145, 72%, 40%)'  // macro → brand green
  if (er >= 0.04) return ER_BENCHMARK_COLORS.mid  // mid → warning
  return ER_BENCHMARK_COLORS.micro               // micro → info
}

const TOOLTIP_STYLE = {
  background: 'var(--color-background-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

export function ErBenchmarkChart({ data }: ErBenchmarkChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-[12px] text-foreground-muted">
        No engagement rate data available.
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b.er - a.er)
  const axisStyle = { fontSize: 11, fill: 'hsl(150, 5%, 55%)' }

  return (
    <div>
      <div className="mb-3 flex items-center gap-5 text-[10px] text-foreground-muted">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: 'hsl(145, 72%, 40%)' }} />
          ≥8% Macro
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: ER_BENCHMARK_COLORS.mid }} />
          ≥4% Mid
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: ER_BENCHMARK_COLORS.micro }} />
          &lt;4% Micro
        </span>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(180, sorted.length * 34)}>
        <BarChart
          layout="vertical"
          data={sorted}
          margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_COLORS.muted}
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={axisStyle}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatPercent(v)}
            domain={[0, 'dataMax']}
          />
          <YAxis
            type="category"
            dataKey="handle"
            tick={axisStyle}
            axisLine={false}
            tickLine={false}
            width={90}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number) => [formatPercent(value), 'ER']}
          />
          <ReferenceLine x={0.02} stroke={ER_BENCHMARK_COLORS.micro} strokeDasharray="4 2" strokeWidth={1.5} />
          <ReferenceLine x={0.04} stroke={ER_BENCHMARK_COLORS.mid}   strokeDasharray="4 2" strokeWidth={1.5} />
          <ReferenceLine x={0.08} stroke="hsl(145, 72%, 40%)"        strokeDasharray="4 2" strokeWidth={1.5} />
          <Bar dataKey="er" radius={[0, 5, 5, 0]}>
            {sorted.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.er)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
