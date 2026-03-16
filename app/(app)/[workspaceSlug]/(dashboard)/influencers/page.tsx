import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { AddInfluencerDialog } from '@/components/influencers/add-influencer-dialog'
import { InfluencerTable } from '@/components/influencers/influencer-table'
import type { WorkspaceRole } from '@/lib/types'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function InfluencersPage({ params }: PageProps) {
  const { workspaceSlug } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', workspaceSlug)
    .single()
  if (!workspace) redirect('/app')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .single()

  const role = (member?.role ?? 'viewer') as WorkspaceRole
  const canEdit = ['owner', 'admin', 'editor'].includes(role)

  const [{ data: influencers }, { data: campaignInfluencers }] =
    await Promise.all([
      supabase
        .from('influencers')
        .select('id, full_name, ig_handle, tiktok_handle, youtube_handle')
        .eq('workspace_id', workspace.id)
        .order('full_name', { ascending: true }),
      supabase
        .from('campaign_influencers')
        .select('influencer_id')
        .in(
          'campaign_id',
          (
            await supabase
              .from('campaigns')
              .select('id')
              .eq('workspace_id', workspace.id)
          ).data?.map((c) => c.id) ?? []
        ),
    ])

  // Count campaigns per influencer
  const campaignCountMap: Record<string, number> = {}
  ;(campaignInfluencers ?? []).forEach((ci) => {
    campaignCountMap[ci.influencer_id] =
      (campaignCountMap[ci.influencer_id] ?? 0) + 1
  })

  const enrichedInfluencers = (influencers ?? []).map((inf) => ({
    ...inf,
    campaign_count: campaignCountMap[inf.id] ?? 0,
  }))

  return (
    <div>
      <PageHeader
        title="Influencers"
        actions={
          canEdit ? (
            <AddInfluencerDialog workspaceId={workspace.id} />
          ) : undefined
        }
      />

      <div className="p-5">
        <div className="rounded-xl border border-border bg-background-surface shadow-sm">
          <InfluencerTable
            influencers={enrichedInfluencers}
            canEdit={canEdit}
          />
        </div>
      </div>
    </div>
  )
}
