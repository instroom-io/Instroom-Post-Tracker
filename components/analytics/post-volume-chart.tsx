'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { CHART_COLORS } from '@/lib/constants/platform-colors'

interface DayData {
  date: string
  total?: number
  instagram?: number
  tiktok?: number
  youtube?: number
}

interface PostVolumeChartProps {
  data: DayData[]
  multiPlatform?: boolean
}

export function PostVolumeChart({ data, multiPlatform = false }: PostVolumeChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-[12px] text-foreground-muted">
        No post data for this period.
      </div>
    )
  }

  const axisStyle = { fontSize: 11, fill: 'hsl(150, 5%, 55%)' }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={CHART_COLORS.muted}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          width={28}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--color-background-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
        />
        {multiPlatform && (
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
        )}
        {multiPlatform && (
          <Line type="monotone" dataKey="instagram" stroke={CHART_COLORS.instagram} strokeWidth={2} dot={false} name="Instagram" />
        )}
        {multiPlatform && (
          <Line type="monotone" dataKey="tiktok" stroke={CHART_COLORS.tiktok} strokeWidth={2} dot={false} name="TikTok" />
        )}
        {multiPlatform && (
          <Line type="monotone" dataKey="youtube" stroke={CHART_COLORS.youtube} strokeWidth={2} dot={false} name="YouTube" />
        )}
        {!multiPlatform && (
          <Line type="monotone" dataKey="total" stroke={CHART_COLORS.brand} strokeWidth={2} dot={false} name="Posts" />
        )}
      </LineChart>
    </ResponsiveContainer>
  )
}
