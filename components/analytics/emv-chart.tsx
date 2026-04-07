'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts'
import { formatEMV } from '@/lib/utils'
import { CHART_COLORS } from '@/lib/constants/platform-colors'

interface EmvData {
  handle: string
  emv: number
}

interface EmvChartProps {
  data: EmvData[]
}

const TOOLTIP_STYLE = {
  background: 'var(--color-background-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
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
  const axisStyle = { fontSize: 11, fill: 'hsl(0, 0%, 52%)' }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, sorted.length * 34)}>
      <BarChart
        layout="vertical"
        data={sorted}
        margin={{ top: 4, right: 88, bottom: 4, left: 0 }}
      >
        <defs>
          <linearGradient id="emvBarGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(145, 72%, 48%)" stopOpacity={1} />
            <stop offset="100%" stopColor="hsl(145, 72%, 36%)" stopOpacity={1} />
          </linearGradient>
        </defs>
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
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number) => [formatEMV(value), 'EMV']}
        />
        <Bar
          dataKey="emv"
          fill="url(#emvBarGradient)"
          radius={[0, 5, 5, 0]}
        >
          <LabelList
            dataKey="emv"
            position="right"
            formatter={(v: number) => formatEMV(v)}
            style={{ fontSize: 10, fill: 'hsl(0, 0%, 52%)', fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
