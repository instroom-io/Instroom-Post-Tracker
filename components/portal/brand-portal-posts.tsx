import { createClient } from '@/lib/supabase/server'
import { ImageOff } from 'lucide-react'

interface Props {
  workspaceId: string
}

export async function BrandPortalPosts({ workspaceId }: Props) {
  const supabase = await createClient()

  // Join to influencers to get handle — posts table has influencer_id FK, not a denormalized handle column.
  // Correct date column is posted_at (not published_at).
  const { data: posts, count } = await supabase
    .from('posts')
    .select(
      'id, platform, thumbnail_url, view_count, like_count, download_status, posted_at, influencer:influencer_id(ig_handle, tiktok_handle)',
      { count: 'exact' }
    )
    .eq('workspace_id', workspaceId)
    .eq('download_status', 'downloaded')
    .order('posted_at', { ascending: false })
    .limit(12)

  if (!posts || posts.length === 0) {
    return (
      <p className="py-12 text-center text-[13px] text-foreground-lighter">
        No downloaded posts yet. Your agency is working on it.
      </p>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {posts.map((post) => {
          const inf = post.influencer as unknown as { ig_handle: string | null; tiktok_handle: string | null } | null
          const handle = inf?.ig_handle ?? inf?.tiktok_handle ?? null
          return (
            <div
              key={post.id}
              className="overflow-hidden rounded-xl border border-border bg-background-surface shadow-md"
            >
              {post.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.thumbnail_url}
                  alt={handle ?? 'Post'}
                  className="h-28 w-full object-cover"
                />
              ) : (
                <div className="flex h-28 items-center justify-center bg-background-muted">
                  <ImageOff size={20} className="text-foreground-muted" aria-label="No thumbnail" />
                </div>
              )}
              <div className="p-2.5">
                <p className="text-[12px] font-semibold text-foreground truncate">
                  {handle ? `@${handle}` : '—'}
                </p>
                <p className="text-[11px] text-foreground-lighter capitalize">
                  {post.platform}
                  {post.like_count ? ` · ${post.like_count.toLocaleString()} likes` : ''}
                  {post.view_count ? ` · ${post.view_count.toLocaleString()} views` : ''}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      {(count ?? 0) > 12 && (
        <p className="mt-4 text-center text-[12px] text-foreground-lighter">
          Showing 12 of {count} posts. Open Google Drive to see all.
        </p>
      )}
    </div>
  )
}
