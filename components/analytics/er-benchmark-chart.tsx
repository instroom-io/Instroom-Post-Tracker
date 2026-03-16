'use client'

import {
  BarChart,
  Bar,
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
      {/* micro/mid/macro benchmarks map to info/warning/destructive semantic tokens */}
      <div className="mb-2 flex items-center gap-4 text-[10px] text-foreground-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-px w-3 bg-info" /> Micro 2%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-px w-3 bg-warning" /> Mid 4%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-px w-3 bg-destructive" /> Macro 8%
        </span>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(180, sorted.length * 32)}>
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
            contentStyle={{
              background: 'var(--color-background-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [formatPercent(value), 'ER']}
          />
          <ReferenceLine x={0.02} stroke={ER_BENCHMARK_COLORS.micro} strokeDasharray="4 2" strokeWidth={1.5} />
          <ReferenceLine x={0.04} stroke={ER_BENCHMARK_COLORS.mid}   strokeDasharray="4 2" strokeWidth={1.5} />
          <ReferenceLine x={0.08} stroke={ER_BENCHMARK_COLORS.macro} strokeDasharray="4 2" strokeWidth={1.5} />
          <Bar
            dataKey="er"
            fill={CHART_COLORS.brand}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
