import { Badge } from '@/components/ui/badge'
import { formatRelativeDate } from '@/lib/utils'
import type { Platform } from '@/lib/types'

interface Post {
  id: string
  thumbnail_url: string | null
  platform: Platform
  posted_at: string
  influencer: { full_name: string } | null
}

interface RecentPostsGridProps {
  posts: Post[]
}

const platformVariant: Record<Platform, 'instagram' | 'tiktok' | 'youtube'> = {
  instagram: 'instagram',
  tiktok: 'tiktok',
  youtube: 'youtube',
}

export function RecentPostsGrid({ posts }: RecentPostsGridProps) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="text-4xl">📭</div>
        <p className="font-display text-[15px] font-bold text-foreground">
          No posts detected
        </p>
        <p className="max-w-xs text-[13px] text-foreground-lighter">
          Posts appear here as Ensemble finds them.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {posts.map((post) => (
        <div
          key={post.id}
          className="group relative overflow-hidden rounded-lg border border-border bg-background-muted"
        >
          {/* Thumbnail */}
          <div className="aspect-square w-full bg-background-muted">
            {post.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.thumbnail_url}
                alt={`Post by ${post.influencer?.full_name ?? 'influencer'}`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-foreground-muted text-2xl">
                🖼
              </div>
            )}
          </div>

          {/* Overlay */}
          <div className="absolute inset-0 flex flex-col justify-between p-2 opacity-0 transition-opacity group-hover:opacity-100 bg-black/40">
            <Badge variant={platformVariant[post.platform]} className="self-start">
              {post.platform}
            </Badge>
            <div>
              <p className="text-[11px] font-medium text-white truncate">
                {post.influencer?.full_name ?? 'Unknown'}
              </p>
              <p className="text-[10px] text-white/70">
                {formatRelativeDate(post.posted_at)}
              </p>
            </div>
          </div>

          {/* Always-visible platform badge */}
          <div className="absolute left-2 top-2 group-hover:opacity-0 transition-opacity">
            <Badge variant={platformVariant[post.platform]} className="self-start">
              {post.platform}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
