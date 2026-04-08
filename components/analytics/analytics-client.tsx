'use client'

import { useState } from 'react'
import { ChartBar, Eye, Percent, TrendUp } from '@phosphor-icons/react'
import { AnalyticsFilterBar, type AnalyticsFilters } from '@/components/analytics/analytics-filter-bar'
import { PostVolumeChart } from '@/components/analytics/post-volume-chart'
import { PlatformBreakdown } from '@/components/analytics/platform-breakdown'
import { EmvChart } from '@/components/analytics/emv-chart'
import { ErBenchmarkChart } from '@/components/analytics/er-benchmark-chart'
import { InfluencerLeaderboard } from '@/components/analytics/influencer-leaderboard'
import { Badge } from '@/components/ui/badge'
import { cn, formatEMV, formatNumber, formatPercent, getInfluencerLabel } from '@/lib/utils'
import type { Platform } from '@/lib/types'

export interface PostMetricRow {
  views: number
  engagement_rate: number
  emv: number
  post: {
    id: string
    platform: Platform
    posted_at: string
    campaign_id: string | null
    influencer: {
      tiktok_handle: string | null
      ig_handle: string | null
      youtube_handle: string | null
    } | null
  } | null
}

interface Campaign {
  id: string
  name: string
}

interface AnalyticsClientProps {
  metrics: PostMetricRow[]
  campaigns: Campaign[]
  defaultFilters: AnalyticsFilters
  timezone?: string
}

function ChartCard({
  title,
  badge,
  children,
}: {
  title: string
  badge?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-background-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[13px] font-display font-bold text-foreground">{title}</p>
        {badge && <Badge variant="muted">{badge}</Badge>}
      </div>
      {children}
    </div>
  )
}

export function AnalyticsClient({
  metrics,
  campaigns,
  defaultFilters,
  timezone,
}: AnalyticsClientProps) {
  const [filters, setFilters] = useState<AnalyticsFilters>(defaultFilters)

  const filtered = metrics.filter((m) => {
    if (!m.post) return false
    const date = m.post.posted_at.split('T')[0]
    if (date < filters.from || date > filters.to) return false
    if (filters.platform !== 'all' && m.post.platform !== filters.platform) return false
    if (filters.campaignId !== 'all' && m.post.campaign_id !== filters.campaignId) return false
    return true
  })

  const totalPosts = filtered.length
  const totalViews = filtered.reduce((s, m) => s + m.views, 0)
  const totalEmv = filtered.reduce((s, m) => s + m.emv, 0)
  const avgEr =
    filtered.length > 0
      ? filtered.reduce((s, m) => s + m.engagement_rate, 0) / filtered.length
      : 0

  // Date range label
  const fromDate = new Date(filters.from)
  const toDate = new Date(filters.to)
  const dayDiff = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
  const dateRangeLabel = `${dayDiff}d`

  // PostVolumeChart data
  const dayMap = new Map<string, { total: number; instagram: number; tiktok: number; youtube: number }>()
  filtered.forEach((m) => {
    if (!m.post) return
    const date = m.post.posted_at.split('T')[0]
    const existing = dayMap.get(date) ?? { total: 0, instagram: 0, tiktok: 0, youtube: 0 }
    existing.total += 1
    const p = m.post.platform as 'instagram' | 'tiktok' | 'youtube'
    existing[p] = (existing[p] ?? 0) + 1
    dayMap.set(date, existing)
  })
  const volumeData = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(timezone ? { timeZone: timezone } : {}) }),
      ...counts,
    }))

  // PlatformBreakdown data
  const platformMap = new Map<string, { posts: number; emv: number }>()
  filtered.forEach((m) => {
    if (!m.post) return
    const plat = m.post.platform
    const existing = platformMap.get(plat) ?? { posts: 0, emv: 0 }
    existing.posts += 1
    existing.emv += m.emv
    platformMap.set(plat, existing)
  })
  const platformData = Array.from(platformMap.entries()).map(([platform, data]) => ({
    platform,
    ...data,
  }))

  // EmvChart data
  const influencerEmvMap = new Map<string, { handle: string; emv: number }>()
  filtered.forEach((m) => {
    if (!m.post?.influencer) return
    const handle = getInfluencerLabel(m.post.influencer)
    const existing = influencerEmvMap.get(handle) ?? { handle, emv: 0 }
    existing.emv += m.emv
    influencerEmvMap.set(handle, existing)
  })
  const emvData = Array.from(influencerEmvMap.values())

  // ErBenchmarkChart data
  const influencerErMap = new Map<string, { handle: string; erSum: number; count: number }>()
  filtered.forEach((m) => {
    if (!m.post?.influencer) return
    const handle = getInfluencerLabel(m.post.influencer)
    const existing = influencerErMap.get(handle) ?? { handle, erSum: 0, count: 0 }
    existing.erSum += m.engagement_rate
    existing.count += 1
    influencerErMap.set(handle, existing)
  })
  const erData = Array.from(influencerErMap.values()).map(({ handle, erSum, count }) => ({
    handle,
    er: count > 0 ? erSum / count : 0,
  }))

  // Leaderboard
  const leaderboardMap = new Map<
    string,
    { fullName: string; handle: string; posts: number; totalViews: number; erSum: number; totalEmv: number }
  >()
  filtered.forEach((m) => {
    if (!m.post?.influencer) return
    const key = getInfluencerLabel(m.post.influencer)
    const existing = leaderboardMap.get(key) ?? {
      fullName: key,
      handle: key,
      posts: 0,
      totalViews: 0,
      erSum: 0,
      totalEmv: 0,
    }
    existing.posts += 1
    existing.totalViews += m.views
    existing.erSum += m.engagement_rate
    existing.totalEmv += m.emv
    leaderboardMap.set(key, existing)
  })
  const leaderboardRows = Array.from(leaderboardMap.values())
    .sort((a, b) => b.totalEmv - a.totalEmv)
    .map((row, idx) => ({
      rank: idx + 1,
      fullName: row.fullName,
      handle: row.handle,
      posts: row.posts,
      totalViews: row.totalViews,
      avgEr: row.posts > 0 ? row.erSum / row.posts : 0,
      totalEmv: row.totalEmv,
    }))

  const multiPlatform = filters.platform === 'all'

  const delayClasses = ['', 'animate-fade-up-delay-1', 'animate-fade-up-delay-2', 'animate-fade-up-delay-3']

  const statCards = [
    {
      label: 'Posts',
      value: totalPosts.toLocaleString(),
      sub: 'tracked this period',
      icon: ChartBar,
      iconBg: 'bg-brand/10',
      iconColor: 'text-brand',
    },
    {
      label: 'Total Views',
      value: formatNumber(totalViews),
      sub: 'across all platforms',
      icon: Eye,
      iconBg: 'bg-info/10',
      iconColor: 'text-info',
    },
    {
      label: 'Avg ER',
      value: avgEr > 0 ? formatPercent(avgEr) : '—',
      sub: 'engagement rate',
      icon: Percent,
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent',
    },
    {
      label: 'Total EMV',
      value: formatEMV(totalEmv),
      sub: 'estimated media value',
      icon: TrendUp,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
  ]

  return (
    <div className="space-y-5">
      <AnalyticsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        campaigns={campaigns}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className={cn('animate-fade-up rounded-xl border border-border-strong bg-background-surface p-4 shadow-xs', delayClasses[i])}
          >
            <div className="flex items-start justify-between">
              <p className="text-[12px] font-medium text-foreground-lighter">{card.label}</p>
              <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', card.iconBg)}>
                <card.icon size={14} weight="duotone" className={card.iconColor} />
              </div>
            </div>
            <p className="mt-2 font-display text-[22px] font-extrabold text-foreground">
              {card.value}
            </p>
            <p className="mt-0.5 text-[11px] text-foreground-muted">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts — 2-col grid */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Post Volume" badge={dateRangeLabel}>
          <PostVolumeChart data={volumeData} multiPlatform={multiPlatform} />
        </ChartCard>

        <ChartCard title="Platform Breakdown">
          <PlatformBreakdown data={platformData} />
        </ChartCard>

        <ChartCard title="EMV by Influencer" badge="Top 10">
          <EmvChart data={emvData} />
        </ChartCard>

        <ChartCard title="Engagement Rate" badge="vs benchmark">
          <ErBenchmarkChart data={erData} />
        </ChartCard>
      </div>

      {/* Leaderboard */}
      <div className="rounded-xl border border-border bg-background-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <p className="text-[13px] font-display font-bold text-foreground">Influencer Leaderboard</p>
          {leaderboardRows.length > 0 && (
            <Badge variant="muted">{leaderboardRows.length} influencers</Badge>
          )}
        </div>
        <InfluencerLeaderboard rows={leaderboardRows} />
      </div>
    </div>
  )
}
