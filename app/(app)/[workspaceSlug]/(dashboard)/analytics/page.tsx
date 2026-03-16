import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { AnalyticsClient } from '@/components/analytics/analytics-client'

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

  const { from, to } = getDefaultDates()

  const [{ data: metrics }, { data: campaigns }, { data: emvConfigs }, { data: member }] =
    await Promise.all([
      supabase
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
            influencer:influencers(full_name, ig_handle)
          )
        `
        )
        .eq('workspace_id', workspace.id),
      supabase
        .from('campaigns')
        .select('id, name')
        .eq('workspace_id', workspace.id)
        .order('name'),
      supabase
        .from('emv_config')
        .select('id, workspace_id, platform, cpm_rate, updated_at')
        .eq('workspace_id', workspace.id),
      supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspace.id)
        .eq('user_id', user!.id)
        .single(),
    ])

  const canEdit =
    member?.role === 'owner' || member?.role === 'admin'

  const metricsData = (metrics ?? []).map((m) => {
    const rawPost = (Array.isArray(m.post) ? (m.post[0] ?? null) : m.post) as {
      id: string; platform: string; posted_at: string; campaign_id: string | null;
      influencer: { full_name: string; ig_handle: string | null } | { full_name: string; ig_handle: string | null }[] | null
    } | null
    return {
      views: Number(m.views),
      engagement_rate: Number(m.engagement_rate),
      emv: Number(m.emv),
      post: rawPost ? {
        id: rawPost.id,
        platform: rawPost.platform as import('@/lib/types').Platform,
        posted_at: rawPost.posted_at,
        campaign_id: rawPost.campaign_id,
        influencer: (Array.isArray(rawPost.influencer) ? (rawPost.influencer[0] ?? null) : rawPost.influencer) as { full_name: string; ig_handle: string | null } | null,
      } : null,
    }
  })

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Analytics" />
      <AnalyticsClient
        metrics={metricsData}
        campaigns={campaigns ?? []}
        emvConfigs={emvConfigs ?? []}
        workspaceId={workspace.id}
        canEdit={canEdit}
        defaultFilters={{ from, to, campaignId: 'all', platform: 'all' }}
      />
    </div>
  )
}
