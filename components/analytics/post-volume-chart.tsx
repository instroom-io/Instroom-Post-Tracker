'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { CHART_COLORS, PLATFORM_COLORS } from '@/lib/constants/platform-colors'
import { PlatformIcon } from '@/components/ui/platform-icon'

type Platform = 'instagram' | 'tiktok' | 'youtube'

function PlatformLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  return (
    <div className="flex justify-center gap-4 pt-1">
      {(payload ?? []).map((entry) => (
        <span key={entry.value} className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <PlatformIcon platform={entry.value as Platform} size={11} />
        </span>
      ))}
    </div>
  )
}

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

const TOOLTIP_STYLE = {
  background: 'var(--color-background-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '10px',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

export function PostVolumeChart({ data, multiPlatform = false }: PostVolumeChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-[12px] text-foreground-muted">
        No post data for this period.
      </div>
    )
  }

  const axisStyle = { fontSize: 11, fill: 'hsl(0, 0%, 52%)' }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
        <defs>
          <linearGradient id="gradientInstagram" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={PLATFORM_COLORS.instagram} stopOpacity={0.22} />
            <stop offset="95%" stopColor={PLATFORM_COLORS.instagram} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradientTiktok" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={PLATFORM_COLORS.tiktok} stopOpacity={0.22} />
            <stop offset="95%" stopColor={PLATFORM_COLORS.tiktok} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradientYoutube" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={PLATFORM_COLORS.youtube} stopOpacity={0.22} />
            <stop offset="95%" stopColor={PLATFORM_COLORS.youtube} stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradientBrand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1FAE5B" stopOpacity={0.22} />
            <stop offset="95%" stopColor="#1FAE5B" stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        {multiPlatform && (
          <Legend content={<PlatformLegend />} />
        )}
        {multiPlatform && (
          <Area
            type="monotone"
            dataKey="instagram"
            stroke={PLATFORM_COLORS.instagram}
            strokeWidth={2}
            fill="url(#gradientInstagram)"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
            name="instagram"
          />
        )}
        {multiPlatform && (
          <Area
            type="monotone"
            dataKey="tiktok"
            stroke={PLATFORM_COLORS.tiktok}
            strokeWidth={2}
            strokeDasharray="5 5"
            fill="url(#gradientTiktok)"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
            name="tiktok"
          />
        )}
        {multiPlatform && (
          <Area
            type="monotone"
            dataKey="youtube"
            stroke={PLATFORM_COLORS.youtube}
            strokeWidth={2}
            strokeDasharray="2 4"
            fill="url(#gradientYoutube)"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
            name="youtube"
          />
        )}
        {!multiPlatform && (
          <Area
            type="monotone"
            dataKey="total"
            stroke="#1FAE5B"
            strokeWidth={2}
            fill="url(#gradientBrand)"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
            name="Posts"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}
