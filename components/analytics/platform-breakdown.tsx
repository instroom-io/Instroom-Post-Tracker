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
  LabelList,
} from 'recharts'
import { formatEMV } from '@/lib/utils'
import { CHART_COLORS } from '@/lib/constants/platform-colors'

interface PlatformData {
  platform: string
  posts: number
  emv: number
}

interface PlatformBreakdownProps {
  data: PlatformData[]
}

export function PlatformBreakdown({ data }: PlatformBreakdownProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-[12px] text-foreground-muted">
        No data available.
      </div>
    )
  }

  const axisStyle = { fontSize: 11, fill: 'hsl(0, 0%, 52%)' }

  const colored = data.map((d) => ({
    ...d,
    fill: CHART_COLORS[d.platform as keyof typeof CHART_COLORS] ?? CHART_COLORS.muted,
  }))

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
          Posts by Platform
        </p>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={colored} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_COLORS.muted}
              vertical={false}
            />
            <XAxis dataKey="platform" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: 'var(--color-background-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar dataKey="posts" radius={[4, 4, 0, 0]}>
              {colored.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <LabelList dataKey="posts" position="top" style={{ fontSize: 10, fill: 'hsl(0, 0%, 52%)' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {data.map((d) => (
          <div
            key={d.platform}
            className="rounded-lg border border-border bg-background-surface p-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted capitalize">
              {d.platform}
            </p>
            <p className="mt-1 text-[18px] font-display font-extrabold text-foreground">
              {d.posts}
            </p>
            <p className="text-[11px] text-foreground-lighter">{formatEMV(d.emv)} EMV</p>
          </div>
        ))}
      </div>
    </div>
  )
}
