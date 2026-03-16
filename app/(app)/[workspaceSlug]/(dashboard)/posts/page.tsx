import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
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
    .select('id')
    .eq('slug', workspaceSlug)
    .single()

  if (!workspace) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: posts }, { data: campaigns }, { data: member }] =
    await Promise.all([
      supabase
        .from('posts')
        .select(
          `
          id,
          thumbnail_url,
          platform,
          posted_at,
          download_status,
          blocked_reason,
          drive_file_id,
          drive_folder_path,
          collab_status,
          influencer:influencers(full_name, ig_handle),
          campaign:campaigns(id, name),
          metrics:post_metrics(views, engagement_rate, emv)
        `
        )
        .eq('workspace_id', workspace.id)
        .order('posted_at', { ascending: false }),
      supabase
        .from('campaigns')
        .select('id, name')
        .eq('workspace_id', workspace.id)
        .order('name'),
      supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspace.id)
        .eq('user_id', user!.id)
        .single(),
    ])

  const canEdit =
    member?.role === 'owner' ||
    member?.role === 'admin' ||
    member?.role === 'editor'

  const postsData = (posts ?? []).map((p) => ({
    id: p.id,
    thumbnail_url: p.thumbnail_url,
    platform: p.platform,
    posted_at: p.posted_at,
    download_status: p.download_status,
    blocked_reason: p.blocked_reason,
    drive_file_id: p.drive_file_id,
    drive_folder_path: p.drive_folder_path,
    collab_status: p.collab_status,
    influencer: Array.isArray(p.influencer) ? p.influencer[0] ?? null : p.influencer,
    campaign: Array.isArray(p.campaign) ? p.campaign[0] ?? null : p.campaign,
    metrics: (() => {
      const raw = Array.isArray(p.metrics) ? p.metrics[0] ?? null : p.metrics
      if (!raw) return null
      const m = raw as Record<string, unknown>
      return { views: Number(m.views), engagement_rate: Number(m.engagement_rate), emv: Number(m.emv) }
    })(),
  }))

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Posts" />
      <PostsTable
        posts={postsData}
        campaigns={campaigns ?? []}
        showCampaignColumn
        canEdit={canEdit}
      />
    </div>
  )
}
