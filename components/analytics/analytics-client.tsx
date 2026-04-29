'use client'

import { useState } from 'react'
import { motion, MotionConfig } from 'framer-motion'
import { AnalyticsFilterBar, type AnalyticsFilters } from '@/components/analytics/analytics-filter-bar'
import { PostVolumeChart } from '@/components/analytics/post-volume-chart'
import { PlatformBreakdown } from '@/components/analytics/platform-breakdown'
import { EmvChart } from '@/components/analytics/emv-chart'
import { ErBenchmarkChart } from '@/components/analytics/er-benchmark-chart'
import { InfluencerLeaderboard } from '@/components/analytics/influencer-leaderboard'
import { Badge } from '@/components/ui/badge'
import { UpgradeGate } from '@/components/ui/upgrade-gate'
import { cn, formatEMV, formatNumber, formatPercent, getInfluencerLabel } from '@/lib/utils'
import type { Platform } from '@/lib/types'
import type { PlanType } from '@/lib/utils/plan'

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
      id: string
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
  plan: PlanType
  workspaceSlug: string
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
    <div className="overflow-hidden rounded-xl border border-border bg-background-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
        <p className="text-[13px] font-display font-bold text-foreground">{title}</p>
        {badge && <Badge variant="muted">{badge}</Badge>}
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  )
}

export function AnalyticsClient({
  metrics,
  campaigns,
  defaultFilters,
  timezone,
  plan,
  workspaceSlug,
}: AnalyticsClientProps) {
  const [filters, setFilters] = useState<AnalyticsFilters>(() => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 29)
    // Use the same timezone as post bucketing so filter bounds are consistent
    const tzOpt = timezone ? { timeZone: timezone } : undefined
    return {
      from: from.toLocaleDateString('en-CA', tzOpt),
      to: to.toLocaleDateString('en-CA', tzOpt),
      campaignId: defaultFilters.campaignId,
      platform: defaultFilters.platform,
    }
  })

  const filtered = metrics.filter((m) => {
    if (!m.post) return false
    const date = new Date(m.post.posted_at).toLocaleDateString('en-CA', timezone ? { timeZone: timezone } : undefined)
    if (filters.from && date < filters.from) return false
    if (filters.to && date > filters.to) return false
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
  const dateRangeLabel = (() => {
    if (!filters.from && !filters.to) return 'All time'
    if (!filters.from || !filters.to) return 'Custom'
    const fromDate = new Date(filters.from)
    const toDate = new Date(filters.to)
    const dayDiff = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return `${dayDiff}d`
  })()

  // PostVolumeChart data
  const dayMap = new Map<string, { total: number; instagram: number; tiktok: number; youtube: number }>()
  filtered.forEach((m) => {
    if (!m.post) return
    const date = new Date(m.post.posted_at).toLocaleDateString('en-CA', timezone ? { timeZone: timezone } : undefined)
    const existing = dayMap.get(date) ?? { total: 0, instagram: 0, tiktok: 0, youtube: 0 }
    existing.total += 1
    const p = m.post.platform as 'instagram' | 'tiktok' | 'youtube'
    existing[p] = (existing[p] ?? 0) + 1
    dayMap.set(date, existing)
  })
  const tzFmt = timezone ? { timeZone: timezone } : {}
  const volumeData = (() => {
    const empty = { total: 0, instagram: 0, tiktok: 0, youtube: 0 }
    if (!filters.from || !filters.to) {
      return Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, counts]) => ({
          date: new Date(key + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...tzFmt }),
          ...counts,
        }))
    }
    const result: Array<{ date: string; total: number; instagram: number; tiktok: number; youtube: number }> = []
    const cur = new Date(filters.from + 'T12:00:00Z')
    const end = new Date(filters.to + 'T12:00:00Z')
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10)
      result.push({
        date: new Date(key + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...tzFmt }),
        ...(dayMap.get(key) ?? empty),
      })
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
    return result
  })()

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
    const { id, ...inf } = m.post.influencer
    const handle = getInfluencerLabel(inf)
    const existing = influencerEmvMap.get(id) ?? { handle, emv: 0 }
    existing.emv += m.emv
    influencerEmvMap.set(id, existing)
  })
  const emvData = Array.from(influencerEmvMap.values())

  // ErBenchmarkChart data
  const influencerErMap = new Map<string, { handle: string; erSum: number; count: number }>()
  filtered.forEach((m) => {
    if (!m.post?.influencer) return
    const { id, ...inf } = m.post.influencer
    const handle = getInfluencerLabel(inf)
    const existing = influencerErMap.get(id) ?? { handle, erSum: 0, count: 0 }
    existing.erSum += m.engagement_rate
    existing.count += 1
    influencerErMap.set(id, existing)
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
    const { id, ...inf } = m.post.influencer
    const handle = getInfluencerLabel(inf)
    const existing = leaderboardMap.get(id) ?? {
      fullName: handle,
      handle,
      posts: 0,
      totalViews: 0,
      erSum: 0,
      totalEmv: 0,
    }
    existing.posts += 1
    existing.totalViews += m.views
    existing.erSum += m.engagement_rate
    existing.totalEmv += m.emv
    leaderboardMap.set(id, existing)
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

  const chartGridVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  } as const
  const chartItemVariant = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] as const } },
  } as const

  const statCards = [
    {
      label: 'Posts',
      value: totalPosts.toLocaleString(),
      sub: `in ${dateRangeLabel}`,
      accentColor: 'bg-brand',
    },
    {
      label: 'Total views',
      value: formatNumber(totalViews),
      sub: 'across all platforms',
      accentColor: 'bg-info',
    },
    {
      label: 'Avg ER',
      value: avgEr > 0 ? formatPercent(avgEr) : '—',
      sub: 'engagement rate',
      accentColor: 'bg-accent',
    },
    {
      label: 'Total EMV',
      value: formatEMV(totalEmv),
      sub: 'estimated media value',
      accentColor: 'bg-warning',
    },
  ]

  return (
    <MotionConfig reducedMotion="user">
    <div className="space-y-5">
      <AnalyticsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        campaigns={campaigns}
        timezone={timezone}
      />

      {/* Section label */}
      <div className="flex items-center gap-3">
        <span className="text-[12px] font-semibold text-foreground-lighter">Performance overview</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className={cn('animate-fade-up rounded-xl border border-border bg-background-surface p-4 shadow-sm', delayClasses[i])}
          >
            <div className={cn('mb-3 h-0.5 w-8 rounded-full', card.accentColor)} />
            <p className="text-[12px] font-medium text-foreground-lighter">{card.label}</p>
            <p className="mt-1 font-display text-[24px] font-extrabold tracking-tight text-foreground tabular-nums">
              {card.value}
            </p>
            <p className="mt-0.5 text-[11px] text-foreground-muted">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Section label */}
      <div className="flex items-center gap-3">
        <span className="text-[12px] font-semibold text-foreground-lighter">Trends & breakdowns</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Charts — 2-col grid */}
      <motion.div
        className="grid gap-5 lg:grid-cols-2"
        variants={chartGridVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={chartItemVariant} data-testid="post-volume-chart">
          <ChartCard title="Posts per Day" badge={dateRangeLabel}>
            <PostVolumeChart data={volumeData} multiPlatform={multiPlatform} />
          </ChartCard>
        </motion.div>

        <motion.div variants={chartItemVariant}>
          <ChartCard title="Platform Breakdown">
            <PlatformBreakdown data={platformData} />
          </ChartCard>
        </motion.div>

        <motion.div variants={chartItemVariant}>
          <UpgradeGate plan={plan} feature="emv_reporting" minHeight="200px">
            <div data-testid="emv-section">
              <ChartCard title="EMV by Influencer" badge="Top 10">
                <EmvChart data={emvData} />
              </ChartCard>
            </div>
          </UpgradeGate>
        </motion.div>

        <motion.div variants={chartItemVariant}>
          <UpgradeGate plan={plan} feature="advanced_analytics" minHeight="200px">
            <ChartCard title="Engagement Rate" badge="vs benchmark">
              <ErBenchmarkChart data={erData} />
            </ChartCard>
          </UpgradeGate>
        </motion.div>
      </motion.div>

      {/* Leaderboard */}
      <UpgradeGate plan={plan} feature="advanced_analytics" minHeight="200px">
        <ChartCard
          title="Influencer Leaderboard"
          badge={leaderboardRows.length > 0 ? `${leaderboardRows.length} influencers` : undefined}
        >
          <InfluencerLeaderboard rows={leaderboardRows} />
        </ChartCard>
      </UpgradeGate>
    </div>
    </MotionConfig>
  )
}
