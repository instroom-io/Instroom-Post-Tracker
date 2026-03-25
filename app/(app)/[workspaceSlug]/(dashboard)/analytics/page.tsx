import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { AnalyticsClient } from '@/components/analytics/analytics-client'
import { EmvConfigForm } from '@/components/analytics/emv-config-form'
import { SectionErrorBoundary } from '@/components/ui/section-error-boundary'
import type { Platform } from '@/lib/types'
import type { AnalyticsFilters } from '@/components/analytics/analytics-filter-bar'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
}

function getDefaultDates() {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - 30)
  return {
    from: from.toISOString().split('T')[0],
    to: to.toISOString().split('T')[0],
  }
}

// ─── Skeleton components ──────────────────────────────────────────────────────

function AnalyticsBodySkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <div className="h-9 w-36 animate-pulse rounded-lg bg-background-muted" />
        <div className="h-9 w-44 animate-pulse rounded-lg bg-background-muted" />
        <div className="h-9 w-36 animate-pulse rounded-lg bg-background-muted" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-background-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-background-surface p-4">
            <div className="h-3 w-16 animate-pulse rounded bg-background-muted" />
            <div className="mt-2 h-7 w-20 animate-pulse rounded bg-background-muted" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-background-surface p-5">
            <div className="mb-4 h-4 w-28 animate-pulse rounded bg-background-muted" />
            <div className="h-48 animate-pulse rounded-lg bg-background-muted" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-background-surface">
        <div className="border-b border-border px-5 py-3.5">
          <div className="h-4 w-40 animate-pulse rounded bg-background-muted" />
        </div>
        <div className="divide-y divide-border/50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <div className="h-3 w-4 animate-pulse rounded bg-background-muted" />
              <div className="h-3 w-28 animate-pulse rounded bg-background-muted" />
              <div className="ml-auto flex gap-4">
                <div className="h-3 w-14 animate-pulse rounded bg-background-muted" />
                <div className="h-3 w-14 animate-pulse rounded bg-background-muted" />
                <div className="h-3 w-14 animate-pulse rounded bg-background-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function EmvConfigSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-background-surface shadow-sm">
      <div className="border-b border-border px-5 py-3.5">
        <div className="h-4 w-32 animate-pulse rounded bg-background-muted" />
      </div>
      <div className="space-y-3 p-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-3 w-20 animate-pulse rounded bg-background-muted" />
            <div className="h-9 w-28 animate-pulse rounded-lg bg-background-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Streaming server components ──────────────────────────────────────────────

async function AnalyticsBody({
  workspaceId,
  campaigns,
  defaultFilters,
}: {
  workspaceId: string
  campaigns: { id: string; name: string }[]
  defaultFilters: AnalyticsFilters
}) {
  const supabase = await createClient()
  const { data: metrics } = await supabase
    .from('post_metrics')
    .select(
      `
      views,
      engagement_rate,
      emv,
      post:posts(
        id,
        platform,
        posted_at,
        campaign_id,
        influencer:influencers(tiktok_handle, ig_handle, youtube_handle)
      )
    `
    )
    .eq('workspace_id', workspaceId)
    .limit(500)

  type InfluencerShape = { tiktok_handle: string | null; ig_handle: string | null; youtube_handle: string | null }
  const metricsData = (metrics ?? []).map((m) => {
    const rawPost = (Array.isArray(m.post) ? (m.post[0] ?? null) : m.post) as {
      id: string; platform: string; posted_at: string; campaign_id: string | null;
      influencer: InfluencerShape | InfluencerShape[] | null
    } | null
    return {
      views: Number(m.views),
      engagement_rate: Number(m.engagement_rate),
      emv: Number(m.emv),
      post: rawPost ? {
        id: rawPost.id,
        platform: rawPost.platform as Platform,
        posted_at: rawPost.posted_at,
        campaign_id: rawPost.campaign_id,
        influencer: (Array.isArray(rawPost.influencer) ? (rawPost.influencer[0] ?? null) : rawPost.influencer) as InfluencerShape | null,
      } : null,
    }
  })

  return (
    <AnalyticsClient
      metrics={metricsData}
      campaigns={campaigns}
      defaultFilters={defaultFilters}
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

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', workspaceSlug)
    .single()

  if (!workspace) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: campaigns }, { data: member }] = await Promise.all([
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
      .eq('user_id', user!.id)
      .single(),
  ])

  const canEdit = member?.role === 'owner' || member?.role === 'admin'
  const { from, to } = getDefaultDates()
  const defaultFilters: AnalyticsFilters = { from, to, campaignId: 'all', platform: 'all' }

  return (
    <div>
      <PageHeader title="Analytics" />
      <div className="space-y-5 p-5">
        <SectionErrorBoundary>
          <Suspense fallback={<AnalyticsBodySkeleton />}>
            <AnalyticsBody
              workspaceId={workspace.id}
              campaigns={campaigns ?? []}
              defaultFilters={defaultFilters}
            />
          </Suspense>
        </SectionErrorBoundary>

        <SectionErrorBoundary>
          <Suspense fallback={<EmvConfigSkeleton />}>
            <AnalyticsEmvSection workspaceId={workspace.id} canEdit={canEdit} />
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </div>
  )
}
