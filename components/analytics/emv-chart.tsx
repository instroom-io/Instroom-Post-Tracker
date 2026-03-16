'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatEMV } from '@/lib/utils'

const CHART_COLORS = {
  brand: 'hsl(145, 72%, 40%)',
  muted: 'hsl(150, 9%, 78%)',
} as const

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
      <div className="flex h-[220px] items-center justify-center text-[12px] text-foreground-muted">
        No EMV data available.
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b.emv - a.emv).slice(0, 10)
  const axisStyle = { fontSize: 11, fill: 'hsl(150, 5%, 55%)' }

  return (
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
          tickFormatter={(v) => formatEMV(v)}
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
          formatter={(value: number) => [formatEMV(value), 'EMV']}
        />
        <Bar
          dataKey="emv"
          fill={CHART_COLORS.brand}
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
