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

  const [{ data: member }, { data: postsRaw }, { data: campaigns }] = await Promise.all([
    supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('posts')
      .select(
        'id, thumbnail_url, platform, posted_at, download_status, blocked_reason, drive_file_id, drive_folder_path, collab_status, influencer:influencers(full_name, ig_handle), campaign:campaigns(id, name), metrics:post_metrics(views, engagement_rate, emv)'
      )
      .eq('workspace_id', workspace.id)
      .order('posted_at', { ascending: false })
      .limit(200),
    supabase
      .from('campaigns')
      .select('id, name')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false }),
  ])

  const role = (member?.role ?? 'viewer') as WorkspaceRole
  const canEdit = ['owner', 'admin', 'editor'].includes(role)

  // Normalize nested relations — Supabase returns arrays for foreign table selects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const posts = (postsRaw ?? []).map((p: any) => ({
    id: p.id as string,
    thumbnail_url: p.thumbnail_url as string | null,
    platform: p.platform,
    posted_at: p.posted_at as string,
    download_status: p.download_status,
    blocked_reason: p.blocked_reason as string | null,
    drive_file_id: p.drive_file_id as string | null,
    drive_folder_path: p.drive_folder_path as string | null,
    collab_status: p.collab_status,
    influencer: Array.isArray(p.influencer)
      ? (p.influencer[0] as { full_name: string; ig_handle: string | null } | undefined) ?? null
      : (p.influencer as { full_name: string; ig_handle: string | null } | null),
    campaign: Array.isArray(p.campaign)
      ? (p.campaign[0] as { id: string; name: string } | undefined) ?? null
      : (p.campaign as { id: string; name: string } | null),
    metrics: Array.isArray(p.metrics)
      ? (p.metrics[0] as { views: number; engagement_rate: number; emv: number } | undefined) ?? null
      : (p.metrics as { views: number; engagement_rate: number; emv: number } | null),
  }))

  return (
    <div>
      <PageHeader title="Posts" />

      <div className="p-5">
        <PostsTable
          posts={posts}
          campaigns={campaigns ?? []}
          showCampaignColumn={true}
          canEdit={canEdit}
        />
      </div>
    </div>
  )
}
