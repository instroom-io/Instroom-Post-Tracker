import { Tray } from '@phosphor-icons/react/dist/ssr'
import { RecentPostCard } from './recent-post-card'
import type { Platform } from '@/lib/types'

interface Post {
  id: string
  thumbnail_url: string | null
  media_url: string | null
  drive_file_id: string | null
  platform: Platform
  posted_at: string
  influencer: { tiktok_handle?: string | null; ig_handle?: string | null; youtube_handle?: string | null } | null
}

interface RecentPostsGridProps {
  posts: Post[]
  workspaceId?: string
}

export function RecentPostsGrid({ posts, workspaceId }: RecentPostsGridProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background-muted">
          <Tray size={18} className="text-foreground-muted" />
        </div>
        <p className="font-display text-[14px] font-bold text-foreground">No posts detected</p>
        <p className="max-w-xs text-[13px] text-foreground-lighter">
          Posts appear here as Ensemble finds them.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {posts.map((post) => (
        <RecentPostCard key={post.id} post={post} workspaceId={workspaceId} />
      ))}
    </div>
  )
}
