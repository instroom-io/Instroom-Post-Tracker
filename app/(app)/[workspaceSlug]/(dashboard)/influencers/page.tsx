import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { AddInfluencerDialog } from '@/components/influencers/add-influencer-dialog'
import {
  InfluencerListTable,
  type InfluencerWithCampaigns,
  type CampaignEntry,
} from '@/components/influencers/influencer-list-table'
import { InfluencerListSkeleton } from '@/components/influencers/influencer-list-skeleton'

const PAGE_SIZE = 20

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ page?: string; campaign?: string }>
}

export default async function InfluencersPage({ params, searchParams }: PageProps) {
  const { workspaceSlug } = await params
  const { page: pageParam, campaign: campaignFilter = '' } = await searchParams

  const page = Math.max(1, parseInt(pageParam ?? '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  const supabase = await createClient()

  // ── Round 1: workspace + auth user (no mutual dependency) ────────────────
  const [{ data: workspace }, { data: { user } }] = await Promise.all([
    supabase.from('workspaces').select('id, name').eq('slug', workspaceSlug).single(),
    supabase.auth.getUser(),
  ])

  if (!workspace) redirect('/app')
  if (!user) redirect('/login')

  // ── Round 2: membership + campaigns + optional campaign filter ────────────
  const [{ data: member }, { data: campaigns }, filterResult] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('campaigns')
      .select('id, name')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false }),
    campaignFilter
      ? supabase
          .from('campaign_influencers')
          .select('influencer_id')
          .eq('campaign_id', campaignFilter)
          .neq('monitoring_status', 'removed')
      : Promise.resolve(null),
  ])

  const canEdit = member?.role
    ? ['owner', 'admin', 'editor'].includes(member.role)
    : false

  // Resolve filter IDs from the conditional Round 2 fetch
  let filteredInfluencerIds: string[] | null = null
  if (campaignFilter && filterResult && 'data' in filterResult) {
    filteredInfluencerIds = filterResult.data?.map((r) => r.influencer_id) ?? []
  }

  const activeCampaign = campaignFilter
    ? (campaigns ?? []).find((c) => c.id === campaignFilter) ?? null
    : null

  // Short-circuit when campaign filter yields empty
  if (filteredInfluencerIds !== null && filteredInfluencerIds.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Influencers"
          description={
            activeCampaign
              ? `0 influencers in ${activeCampaign.name}`
              : '0 influencers in this workspace'
          }
          actions={<AddInfluencerDialog workspaceId={workspace.id} />}
        />
        <InfluencerListTable
          influencers={[]}
          workspaceCampaigns={campaigns ?? []}
          campaignFilter={campaignFilter}
          canEdit={canEdit}
          workspaceSlug={workspaceSlug}
          workspaceId={workspace.id}
          page={page}
          totalCount={0}
          pageSize={PAGE_SIZE}
        />
      </div>
    )
  }

  // ── Round 3: parallel count + page ───────────────────────────────────────
  const buildBaseQuery = () => {
    let q = supabase
      .from('influencers')
      .select('id, ig_handle, tiktok_handle, youtube_handle, profile_pic_url')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })

    if (filteredInfluencerIds !== null && filteredInfluencerIds.length > 0) {
      q = q.in('id', filteredInfluencerIds)
    }
    return q
  }

  const buildCountQuery = () => {
    let q = supabase
      .from('influencers')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id)

    if (filteredInfluencerIds !== null && filteredInfluencerIds.length > 0) {
      q = q.in('id', filteredInfluencerIds)
    }
    return q
  }

  const [countResult, pageResult] = await Promise.all([
    buildCountQuery(),
    buildBaseQuery().range(offset, offset + PAGE_SIZE - 1),
  ])

  const totalCount = countResult.count ?? 0
  const pageInfluencers = pageResult.data ?? []

  // ── Round 4: campaign memberships for this page's influencers ────────────
  type CampaignMembership = {
    id: string
    influencer_id: string
    monitoring_status: string
    campaigns: { id: string; name: string; status: string } | null
  }

  let campaignMemberships: CampaignMembership[] = []

  if (pageInfluencers.length > 0) {
    const { data: ci } = await supabase
      .from('campaign_influencers')
      .select('id, influencer_id, monitoring_status, campaigns(id, name, status)')
      .in(
        'influencer_id',
        pageInfluencers.map((i) => i.id),
      )
      .neq('monitoring_status', 'removed')

    campaignMemberships = (ci ?? []) as unknown as CampaignMembership[]
  }

  // ── Join: build InfluencerWithCampaigns[] ────────────────────────────────
  const influencers: InfluencerWithCampaigns[] = pageInfluencers.map((inf) => {
    const entries: CampaignEntry[] = campaignMemberships
      .filter((ci) => ci.influencer_id === inf.id && ci.campaigns)
      .map((ci) => ({
        campaign_influencer_id: ci.id,
        campaign_id: ci.campaigns!.id,
        name: ci.campaigns!.name,
        status: ci.campaigns!.status as CampaignEntry['status'],
        monitoring_status: ci.monitoring_status as CampaignEntry['monitoring_status'],
      }))

    return { ...inf, campaigns: entries }
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Influencers"
        description={
          activeCampaign
            ? `${totalCount} influencer${totalCount !== 1 ? 's' : ''} in ${activeCampaign.name}`
            : `${totalCount} influencer${totalCount !== 1 ? 's' : ''} in this workspace`
        }
        actions={<AddInfluencerDialog workspaceId={workspace.id} />}
      />

      <Suspense fallback={<InfluencerListSkeleton />}>
        <InfluencerListTable
          influencers={influencers}
          workspaceCampaigns={campaigns ?? []}
          campaignFilter={campaignFilter}
          canEdit={canEdit}
          workspaceSlug={workspaceSlug}
          workspaceId={workspace.id}
          page={page}
          totalCount={totalCount}
          pageSize={PAGE_SIZE}
        />
      </Suspense>
    </div>
  )
}
