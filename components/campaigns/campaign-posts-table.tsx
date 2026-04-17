'use client'

import { useState } from 'react'
import { Tray, ImageBroken, ArrowSquareOut, Play } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { PostDetailModal } from './post-detail-modal'
import { formatRelativeDate, formatNumber, formatEMV, formatPercent, getInfluencerLabel } from '@/lib/utils'
import type { Platform, DownloadStatus, CampaignTrackingConfig } from '@/lib/types'

interface PostRow {
  id: string
  thumbnail_url: string | null
  media_url: string | null
  caption: string | null
  post_url: string | null
  platform: Platform
  posted_at: string
  download_status: DownloadStatus
  drive_file_id: string | null
  influencer: { tiktok_handle: string | null; ig_handle: string | null; youtube_handle: string | null } | null
  metrics: {
    views: number
    likes: number
    comments: number
    shares: number
    saves: number | null
    follower_count: number
    engagement_rate: number
    emv: number
  } | null
}

interface CampaignPostsTableProps {
  posts: PostRow[]
  trackingConfigs?: CampaignTrackingConfig[]
  showCampaignColumn?: boolean
  campaignName?: string
  workspaceId?: string
  memberDriveUrl?: string
}

const platformVariant: Record<Platform, 'instagram' | 'tiktok' | 'youtube'> = {
  instagram: 'instagram',
  tiktok: 'tiktok',
  youtube: 'youtube',
}


function PostThumbnail({ post }: { post: PostRow }) {
  const [imgFailed, setImgFailed] = useState(false)
  const src = post.thumbnail_url
    ? post.platform !== 'youtube' && !post.thumbnail_url.includes('supabase.co')
      ? `/api/proxy-image?url=${encodeURIComponent(post.thumbnail_url)}`
      : post.thumbnail_url
    : null
  if (src && !imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" onError={() => setImgFailed(true)} className="h-full w-full object-cover" />
    )
  }
  return (
    <div className="flex h-full items-center justify-center">
      <ImageBroken size={14} className="text-foreground-muted" aria-label="No thumbnail" />
    </div>
  )
}

export function CampaignPostsTable({ posts, trackingConfigs = [], workspaceId, memberDriveUrl }: CampaignPostsTableProps) {
  const [selectedPost, setSelectedPost] = useState<PostRow | null>(null)

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
    <>
      <div className="overflow-x-auto">
        <table data-testid="campaign-posts-table" className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="w-16 px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-lighter">
                Post
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-lighter">
                Influencer
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-lighter">
                Platform
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-lighter">
                Posted
              </th>
              <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-lighter">
                Views
              </th>
              <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-lighter">
                ER
              </th>
              <th className="px-5 py-3 text-right text-[11px] font-medium uppercase tracking-wide text-foreground-lighter">
                EMV
              </th>
              <th className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-wide text-foreground-lighter">
                Drive
              </th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => (
              <tr
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-background-muted"
              >
                {/* Thumbnail */}
                <td className="px-5 py-3.5">
                  <div className="relative h-11 w-11 overflow-hidden rounded-lg bg-background-muted flex-shrink-0">
                    <PostThumbnail post={post} />
                    {(post.platform === 'tiktok' || post.platform === 'youtube' || (post.platform === 'instagram' && !!post.media_url)) && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="flex h-4 w-4 items-center justify-center rounded-full bg-black/50">
                          <Play size={7} weight="fill" className="text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </td>

                <td className="px-5 py-3.5">
                  <p className="text-[12px] font-medium text-foreground">
                    {post.influencer ? `@${getInfluencerLabel(post.influencer)}` : '—'}
                  </p>
                </td>

                <td className="px-5 py-3.5">
                  <Badge variant={platformVariant[post.platform]}>
                    {post.platform}
                  </Badge>
                </td>

                <td className="px-5 py-3.5 text-[12px] text-foreground-lighter">
                  {formatRelativeDate(post.posted_at)}
                </td>

                <td className="px-5 py-3.5 text-right text-[12px] font-medium text-foreground">
                  {post.metrics ? formatNumber(post.metrics.views) : '—'}
                </td>

                <td className="px-5 py-3.5 text-right text-[12px] font-medium text-foreground">
                  {post.metrics
                    ? formatPercent(post.metrics.engagement_rate)
                    : '—'}
                </td>

                <td className="px-5 py-3.5 text-right text-[12px] font-medium text-foreground">
                  {post.metrics ? formatEMV(post.metrics.emv) : '—'}
                </td>

                <td className="px-5 py-3.5">
                  {post.drive_file_id ? (
                    <a
                      href={`https://drive.google.com/file/d/${post.drive_file_id}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-brand hover:underline"
                    >
                      View in Drive
                      <ArrowSquareOut size={11} />
                    </a>
                  ) : (
                    <span className="text-[12px] text-foreground-muted">—</span>
                  )}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PostDetailModal
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        trackingConfigs={trackingConfigs}
        workspaceId={workspaceId}
        memberDriveUrl={memberDriveUrl}
      />
    </>
  )
}
