import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { InfluencerTable } from '@/components/influencers/influencer-table'
import { AddInfluencerDialog } from '@/components/influencers/add-influencer-dialog'
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
    .select('id, name')
    .eq('slug', workspaceSlug)
    .single()

  if (!workspace) redirect('/app')

  const [{ data: member }, { data: influencersRaw }] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('influencers')
      .select('id, ig_handle, tiktok_handle, youtube_handle, profile_pic_url, campaign_influencers(count)')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false }),
  ])

  const role = (member?.role ?? 'viewer') as WorkspaceRole
  const canEdit = ['owner', 'admin', 'editor'].includes(role)

  const influencers = (influencersRaw ?? []).map((inf) => ({
    id: inf.id,
    ig_handle: inf.ig_handle,
    tiktok_handle: inf.tiktok_handle,
    youtube_handle: inf.youtube_handle,
    profile_pic_url: inf.profile_pic_url,
    campaign_count: Array.isArray(inf.campaign_influencers)
      ? (inf.campaign_influencers[0] as { count: number } | undefined)?.count ?? 0
      : 0,
  }))

  return (
    <div>
      <PageHeader
        title="Influencers"
        actions={canEdit ? <AddInfluencerDialog workspaceId={workspace.id} /> : undefined}
      />

      <div className="p-5">
        <div className="rounded-xl border border-border bg-background-surface shadow-sm overflow-hidden">
          <InfluencerTable influencers={influencers} canEdit={canEdit} />
        </div>
      </div>
    </div>
  )
}
