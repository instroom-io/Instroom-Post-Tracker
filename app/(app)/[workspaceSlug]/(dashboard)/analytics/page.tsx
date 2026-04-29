import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { AnalyticsClient } from '@/components/analytics/analytics-client'
import { EmvConfigForm } from '@/components/analytics/emv-config-form'
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary'
import { AnalyticsBodySkeleton } from '@/components/dashboard/analytics-body-skeleton'
import { EmvSectionSkeleton } from '@/components/dashboard/emv-section-skeleton'
import type { Platform } from '@/lib/types'
import type { AnalyticsFilters } from '@/components/analytics/analytics-filter-bar'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
}


// ─── Streaming server components ──────────────────────────────────────────────

async function AnalyticsBody({
  workspaceId,
  workspaceSlug,
  campaigns,
  defaultFilters,
  timezone,
  plan,
}: {
  workspaceId: string
  workspaceSlug: string
  campaigns: { id: string; name: string }[]
  defaultFilters: AnalyticsFilters
  timezone: string
  plan: string
}) {
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('posts')
    .select(
      `
      id,
      platform,
      posted_at,
      campaign_id,
      influencer:influencers(id, tiktok_handle, ig_handle, youtube_handle),
      metrics:post_metrics(views, engagement_rate, emv, fetched_at)
    `
    )
    .eq('workspace_id', workspaceId)
    .order('posted_at', { ascending: false })
    .limit(1000)

  type InfluencerShape = { id: string; tiktok_handle: string | null; ig_handle: string | null; youtube_handle: string | null }
  type MetricShape = { views: number; engagement_rate: number; emv: number; fetched_at: string }
  const metricsData = (posts ?? []).map((p) => {
    const rawInfluencer = (Array.isArray(p.influencer) ? (p.influencer[0] ?? null) : p.influencer) as InfluencerShape | null
    const rawMetrics = (Array.isArray(p.metrics) ? p.metrics : (p.metrics ? [p.metrics] : [])) as MetricShape[]
    const latestMetric = rawMetrics.length > 0
      ? rawMetrics.reduce((best, m) => new Date(m.fetched_at) > new Date(best.fetched_at) ? m : best)
      : null
    return {
      views: latestMetric ? Number(latestMetric.views) : 0,
      engagement_rate: latestMetric ? Number(latestMetric.engagement_rate) : 0,
      emv: latestMetric ? Number(latestMetric.emv) : 0,
      post: {
        id: p.id,
        platform: p.platform as Platform,
        posted_at: p.posted_at,
        campaign_id: p.campaign_id,
        influencer: rawInfluencer,
      },
    }
  })

  return (
    <AnalyticsClient
      metrics={metricsData}
      campaigns={campaigns}
      defaultFilters={defaultFilters}
      timezone={timezone}
      plan={plan as import('@/lib/utils/plan').PlanType}
      workspaceSlug={workspaceSlug}
    />
  )
}

async function AnalyticsEmvSection({
  workspaceId,
  canEdit,
}: {
  workspaceId: string
  canEdit: boolean
}) {
  const supabase = await createClient()
  const { data: emvConfigs } = await supabase
    .from('emv_config')
    .select('id, workspace_id, platform, cpm_rate, updated_at')
    .eq('workspace_id', workspaceId)

  return (
    <div className="rounded-xl border border-border bg-background-surface shadow-sm">
      <div className="border-b border-border px-5 py-3.5">
        <p className="text-[13px] font-display font-bold text-foreground">EMV Configuration</p>
      </div>
      <div className="p-5">
        <p className="mb-4 text-[12px] text-foreground-lighter">
          CPM rates used to calculate Estimated Media Value. Changes apply to future posts only.
        </p>
        <EmvConfigForm
          workspaceId={workspaceId}
          configs={emvConfigs ?? []}
          canEdit={canEdit}
        />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AnalyticsPage({ params }: PageProps) {
  const { workspaceSlug } = await params
  const supabase = await createClient()

  const [{ data: workspace }, { data: { user } }] = await Promise.all([
    supabase.from('workspaces').select('id, plan').eq('slug', workspaceSlug).single(),
    supabase.auth.getUser(),
  ])

  if (!workspace) notFound()
  if (!user) redirect('/login')

  const [{ data: campaigns }, { data: member }, { data: userPrefs }] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id, name')
      .eq('workspace_id', workspace.id)
      .order('name')
      .limit(100),
    supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('users')
      .select('timezone')
      .eq('id', user.id)
      .single(),
  ])

  const canEdit = member?.role === 'owner' || member?.role === 'admin' || member?.role === 'manager'
  const timezone = userPrefs?.timezone ?? 'UTC'
  // Dates are intentionally omitted — the client computes them in the user's local timezone
  const defaultFilters: AnalyticsFilters = { from: '', to: '', campaignId: 'all', platform: 'all' }

  return (
    <div>
      <PageHeader title="Analytics" description="Post metrics, EMV, and influencer performance." />
      <div className="space-y-5 p-5">
        <SectionErrorBoundary>
          <Suspense fallback={<AnalyticsBodySkeleton />}>
            <AnalyticsBody
              workspaceId={workspace.id}
              workspaceSlug={workspaceSlug}
              campaigns={campaigns ?? []}
              defaultFilters={defaultFilters}
              timezone={timezone}
              plan={workspace.plan ?? 'trial'}
            />
          </Suspense>
        </SectionErrorBoundary>

        <SectionErrorBoundary>
          <Suspense fallback={<EmvSectionSkeleton />}>
            <AnalyticsEmvSection workspaceId={workspace.id} canEdit={canEdit} />
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </div>
  )
}
