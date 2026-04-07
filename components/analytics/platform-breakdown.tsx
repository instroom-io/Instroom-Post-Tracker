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
import { CHART_COLORS, PLATFORM_COLORS } from '@/lib/constants/platform-colors'
import { PlatformIcon } from '@/components/ui/platform-icon'

interface PlatformData {
  platform: string
  posts: number
  emv: number
}

interface PlatformBreakdownProps {
  data: PlatformData[]
}

const TOOLTIP_STYLE = {
  background: 'var(--color-background-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
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
  const totalPosts = data.reduce((s, d) => s + d.posts, 0)

  const colored = data.map((d) => ({
    ...d,
    fill: PLATFORM_COLORS[d.platform as keyof typeof PLATFORM_COLORS] ?? CHART_COLORS.muted,
  }))

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">
          Posts by Platform
        </p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={colored} margin={{ top: 8, right: 4, bottom: 4, left: 0 }}>
            <defs>
              {colored.map((d) => (
                <linearGradient key={`grad-${d.platform}`} id={`grad-${d.platform}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={d.fill} stopOpacity={1} />
                  <stop offset="100%" stopColor={d.fill} stopOpacity={0.7} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={CHART_COLORS.muted}
              vertical={false}
            />
            <XAxis dataKey="platform" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="posts" radius={[5, 5, 0, 0]}>
              {colored.map((entry) => (
                <Cell key={entry.platform} fill={`url(#grad-${entry.platform})`} />
              ))}
              <LabelList dataKey="posts" position="top" style={{ fontSize: 10, fill: 'hsl(0, 0%, 52%)', fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {data.map((d) => {
          const pct = totalPosts > 0 ? Math.round((d.posts / totalPosts) * 100) : 0
          return (
            <div
              key={d.platform}
              className="rounded-lg border border-border bg-background-surface p-3 transition-colors hover:bg-background-muted/50"
            >
              <div className="mb-1 flex items-center gap-1.5">
                <PlatformIcon platform={d.platform as 'instagram' | 'tiktok' | 'youtube'} size={11} />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted capitalize">
                  {d.platform}
                </p>
              </div>
              <p className="text-[18px] font-display font-extrabold leading-none text-foreground">
                {d.posts}
              </p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-[10px] text-foreground-lighter">{formatEMV(d.emv)} EMV</p>
                <p className="text-[10px] font-semibold text-foreground-muted">{pct}%</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
