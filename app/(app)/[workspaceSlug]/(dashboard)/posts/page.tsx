import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { PostsTable } from '@/components/posts/posts-table'
import type { WorkspaceRole } from '@/lib/types'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function PostsPage({ params }: PageProps) {
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

  const [{ data: posts }, { data: campaigns }] = await Promise.all([
    supabase
      .from('posts')
      .select(`
        id,
        platform,
        post_url,
        caption,
        thumbnail_url,
        posted_at,
        download_status,
        blocked_reason,
        drive_file_id,
        drive_folder_path,
        collab_status,
        influencer:influencers(full_name, ig_handle),
        campaign:campaigns(id, name),
        metrics:post_metrics(views, engagement_rate, emv)
      `)
      .eq('workspace_id', workspace.id)
      .order('posted_at', { ascending: false })
      .limit(200),
    supabase
      .from('campaigns')
      .select('id, name')
      .eq('workspace_id', workspace.id)
      .order('name'),
  ])

  type InfluencerShape = { full_name: string; ig_handle: string | null }
  type CampaignShape = { id: string; name: string }
  type MetricsShape = { views: number; engagement_rate: number; emv: number }

  const normalizedPosts = (posts ?? []).map((p) => ({
    id: p.id,
    platform: p.platform,
    post_url: p.post_url,
    caption: p.caption,
    thumbnail_url: p.thumbnail_url,
    posted_at: p.posted_at,
    download_status: p.download_status,
    blocked_reason: p.blocked_reason,
    drive_file_id: p.drive_file_id,
    drive_folder_path: p.drive_folder_path,
    collab_status: p.collab_status,
    influencer: (Array.isArray(p.influencer) ? (p.influencer[0] ?? null) : p.influencer) as InfluencerShape | null,
    campaign: (Array.isArray(p.campaign) ? (p.campaign[0] ?? null) : p.campaign) as CampaignShape | null,
    metrics: (Array.isArray(p.metrics) ? (p.metrics[0] ?? null) : p.metrics) as MetricsShape | null,
  }))

  const totalPosts = normalizedPosts.length

  return (
    <div>
      <PageHeader
        title="Posts"
        description={totalPosts > 0 ? `${totalPosts} posts across all campaigns` : 'No posts detected yet'}
      />
      <div className="p-5">
        <PostsTable
          posts={normalizedPosts}
          campaigns={campaigns ?? []}
          showCampaignColumn
          canEdit={canEdit}
        />
      </div>
    </div>
  )
}
