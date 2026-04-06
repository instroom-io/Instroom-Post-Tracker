import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/layout/page-header'
import { PostsTable } from '@/components/posts/posts-table'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function PostsPage({ params }: PageProps) {
  const { workspaceSlug } = await params
  const supabase = await createClient()

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('slug', workspaceSlug)
    .single()

  if (!workspace) redirect('/app')

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .single()

  const canEdit = member?.role
    ? ['owner', 'admin', 'editor'].includes(member.role)
    : false

  const [{ data: posts }, { data: campaigns }] = await Promise.all([
    supabase
      .from('posts')
      .select(
        'id, thumbnail_url, media_url, platform, posted_at, download_status, blocked_reason, drive_file_id, drive_folder_path, influencer:influencers(full_name, ig_handle), campaign:campaigns(id, name), metrics:post_metrics(views, engagement_rate, emv)'
      )
      .eq('workspace_id', workspace.id)
      .order('posted_at', { ascending: false })
      .limit(500),
    supabase
      .from('campaigns')
      .select('id, name')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Posts"
        description={`${posts?.length ?? 0} post${(posts?.length ?? 0) !== 1 ? 's' : ''} detected`}
      />
      <PostsTable
        posts={(posts ?? []) as unknown as Parameters<typeof PostsTable>[0]['posts']}
        campaigns={campaigns ?? []}
        showCampaignColumn
        canEdit={canEdit}
        workspaceId={workspace.id}
      />
    </div>
  )
}
