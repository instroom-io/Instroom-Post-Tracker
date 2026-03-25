import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { CampaignsTable } from '@/components/dashboard/campaigns-table'
import { CreateCampaignDialog } from '@/components/campaigns/create-campaign-dialog'
import type { WorkspaceRole, CampaignStatus } from '@/lib/types'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
}

const statusVariant: Record<CampaignStatus, 'active' | 'draft' | 'ended'> = {
  active: 'active',
  draft: 'draft',
  ended: 'ended',
}

export default async function CampaignsPage({ params }: PageProps) {
  const { workspaceSlug } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name')
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

  const [{ data: campaigns }, { data: postCounts }] = await Promise.all([
    supabase
      .from('campaigns')
      .select('id, name, status, start_date, end_date')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('posts')
      .select('campaign_id')
      .eq('workspace_id', workspace.id),
  ])

  const postCountMap: Record<string, number> = {}
  ;(postCounts ?? []).forEach((p) => {
    postCountMap[p.campaign_id] = (postCountMap[p.campaign_id] ?? 0) + 1
  })

  const enrichedCampaigns = (campaigns ?? []).map((c) => ({
    ...c,
    status: c.status as CampaignStatus,
    post_count: postCountMap[c.id] ?? 0,
  }))

  return (
    <div>
      <PageHeader
        title="Campaigns"
        actions={
          canEdit ? (
            <CreateCampaignDialog workspaceId={workspace.id} />
          ) : undefined
        }
      />

      <div className="p-5">
        <div className="rounded-xl border border-border bg-background-surface shadow-sm">
          <CampaignsTable campaigns={enrichedCampaigns} workspaceSlug={workspaceSlug} />
        </div>
      </div>
    </div>
  )
}
