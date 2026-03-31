'use client'

import { useState } from 'react'
import { BarChart3, Eye, Percent, TrendingUp } from 'lucide-react'
import { AnalyticsFilterBar, type AnalyticsFilters } from '@/components/analytics/analytics-filter-bar'
import { PostVolumeChart } from '@/components/analytics/post-volume-chart'
import { PlatformBreakdown } from '@/components/analytics/platform-breakdown'
import { EmvChart } from '@/components/analytics/emv-chart'
import { ErBenchmarkChart } from '@/components/analytics/er-benchmark-chart'
import { InfluencerLeaderboard } from '@/components/analytics/influencer-leaderboard'
import { formatEMV, formatNumber, formatPercent, getInfluencerLabel } from '@/lib/utils'
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
}

export function AnalyticsClient({
  metrics,
  campaigns,
  defaultFilters,
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
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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

  const statCards = [
    { label: 'Posts', value: totalPosts.toLocaleString(), icon: BarChart3, iconBg: 'bg-brand/10', iconColor: 'text-brand' },
    { label: 'Total Views', value: formatNumber(totalViews), icon: Eye, iconBg: 'bg-info/10', iconColor: 'text-info' },
    { label: 'Avg ER', value: avgEr > 0 ? formatPercent(avgEr) : '—', icon: Percent, iconBg: 'bg-warning/10', iconColor: 'text-warning' },
    { label: 'Total EMV', value: formatEMV(totalEmv), icon: TrendingUp, iconBg: 'bg-warning/10', iconColor: 'text-warning' },
  ]

  return (
    <div className="space-y-5">
      <AnalyticsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        campaigns={campaigns}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border bg-background-surface p-4 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <p className="text-[12px] font-medium text-foreground-lighter">{card.label}</p>
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.iconBg}`}>
                <card.icon size={14} className={card.iconColor} />
              </div>
            </div>
            <p className="mt-2 text-[22px] font-display font-extrabold text-foreground">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-background-surface p-5 shadow-sm">
          <p className="mb-4 text-[13px] font-display font-bold text-foreground">
            Post Volume
          </p>
          <PostVolumeChart data={volumeData} multiPlatform={multiPlatform} />
        </div>

        <div className="rounded-xl border border-border bg-background-surface p-5 shadow-sm">
          <p className="mb-4 text-[13px] font-display font-bold text-foreground">
            Platform Breakdown
          </p>
          <PlatformBreakdown data={platformData} />
        </div>

        <div className="rounded-xl border border-border bg-background-surface p-5 shadow-sm">
          <p className="mb-4 text-[13px] font-display font-bold text-foreground">
            EMV by Influencer
          </p>
          <EmvChart data={emvData} />
        </div>

        <div className="rounded-xl border border-border bg-background-surface p-5 shadow-sm">
          <p className="mb-4 text-[13px] font-display font-bold text-foreground">
            Engagement Rate
          </p>
          <ErBenchmarkChart data={erData} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background-surface shadow-sm">
        <div className="border-b border-border px-5 py-3.5">
          <p className="text-[13px] font-display font-bold text-foreground">
            Influencer Leaderboard
          </p>
        </div>
        <InfluencerLeaderboard rows={leaderboardRows} />
      </div>

    </div>
  )
}
