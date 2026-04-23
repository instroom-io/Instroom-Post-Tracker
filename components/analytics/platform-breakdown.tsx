'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { ChartBar } from '@phosphor-icons/react/dist/ssr'
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
      <div className="flex h-[180px] flex-col items-center justify-center gap-2 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background-muted">
          <ChartBar size={16} className="text-foreground-muted" />
        </div>
        <p className="text-[12px] text-foreground-lighter">No data available.</p>
      </div>
    )
  }

  const totalPosts = data.reduce((s, d) => s + d.posts, 0)

  const colored = data.map((d) => ({
    ...d,
    fill: PLATFORM_COLORS[d.platform as keyof typeof PLATFORM_COLORS] ?? CHART_COLORS.muted,
  }))

  return (
    <div className="space-y-4">
      {/* Donut chart */}
      <div className="relative">
        <ResponsiveContainer width="100%" height={160}>
          <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Pie
              data={colored}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={68}
              dataKey="posts"
              nameKey="platform"
              paddingAngle={3}
              stroke="none"
            >
              {colored.map((entry) => (
                <Cell key={entry.platform} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value, name) => {
                const nameStr = String(name)
                return [String(value) + ' posts', nameStr.charAt(0).toUpperCase() + nameStr.slice(1)]
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-display text-[20px] font-extrabold leading-none text-foreground">
            {totalPosts}
          </p>
          <p className="mt-0.5 text-[10px] text-foreground-muted">posts</p>
        </div>
      </div>

      {/* Platform metric cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {colored.map((d) => {
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
