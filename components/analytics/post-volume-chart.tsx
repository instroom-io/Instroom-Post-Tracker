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
import { ChartBar } from '@phosphor-icons/react/dist/ssr'
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

interface TooltipEntry { name: string; value: number; color: string; dataKey: string }

function PlatformTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null
  const entries = payload.filter(p => (p.value ?? 0) > 0)
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2.5">
      <p className="mb-1.5 text-[11px] font-medium" style={{ color: 'var(--color-foreground)' }}>{label}</p>
      {entries.length === 0 ? (
        <p className="text-[11px]" style={{ color: 'var(--color-foreground-muted)' }}>No posts</p>
      ) : entries.map(entry => (
        <p key={entry.dataKey} className="text-[11px]" style={{ color: entry.color }}>
          {entry.name} : {entry.value}
        </p>
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
      <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-center">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background-muted">
          <ChartBar size={16} className="text-foreground-muted" />
        </div>
        <p className="text-[12px] text-foreground-lighter">No post data for this period.</p>
      </div>
    )
  }

  const axisStyle = { fontSize: 11, fill: 'hsl(0, 0%, 52%)' }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
        <defs>
          <linearGradient id="gradientBrand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1FAE5B" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#1FAE5B" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.muted} vertical={false} />
        <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ stroke: 'hsl(0, 0%, 80%)', strokeWidth: 1 }}
          content={multiPlatform ? <PlatformTooltip /> : undefined}
        />
        {multiPlatform && <Legend content={<PlatformLegend />} />}

        {/* Multi-platform: stacked areas with solid fills */}
        {multiPlatform && (
          <Area
            type="monotone"
            dataKey="instagram"
            stackId="a"
            stroke={PLATFORM_COLORS.instagram}
            strokeWidth={1}
            fill={PLATFORM_COLORS.instagram}
            fillOpacity={0.85}
            dot={false}
            activeDot={(props: any) => (props.payload?.instagram ?? 0) > 0 ? <circle cx={props.cx} cy={props.cy} r={3} fill={PLATFORM_COLORS.instagram} strokeWidth={0} /> : <g />}
            name="instagram"
          />
        )}
        {multiPlatform && (
          <Area
            type="monotone"
            dataKey="tiktok"
            stackId="a"
            stroke={PLATFORM_COLORS.tiktok}
            strokeWidth={1}
            fill={PLATFORM_COLORS.tiktok}
            fillOpacity={0.85}
            dot={false}
            activeDot={(props: any) => (props.payload?.tiktok ?? 0) > 0 ? <circle cx={props.cx} cy={props.cy} r={3} fill={PLATFORM_COLORS.tiktok} strokeWidth={0} /> : <g />}
            name="tiktok"
          />
        )}
        {multiPlatform && (
          <Area
            type="monotone"
            dataKey="youtube"
            stackId="a"
            stroke={PLATFORM_COLORS.youtube}
            strokeWidth={1}
            fill={PLATFORM_COLORS.youtube}
            fillOpacity={0.85}
            dot={false}
            activeDot={(props: any) => (props.payload?.youtube ?? 0) > 0 ? <circle cx={props.cx} cy={props.cy} r={3} fill={PLATFORM_COLORS.youtube} strokeWidth={0} /> : <g />}
            name="youtube"
          />
        )}

        {/* Single-platform: gradient brand area */}
        {!multiPlatform && (
          <Area
            type="monotone"
            dataKey="total"
            stroke="#1FAE5B"
            strokeWidth={1.5}
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
