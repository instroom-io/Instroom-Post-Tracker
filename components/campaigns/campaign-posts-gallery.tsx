'use client'

import { useState, useRef } from 'react'
import { Inbox, ImageOff, Eye, Percent, DollarSign, ExternalLink, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PostDetailModal } from './post-detail-modal'
import { formatRelativeDate, formatNumber, formatEMV, formatPercent, cn, getInfluencerLabel } from '@/lib/utils'
import type { Platform, DownloadStatus, CollabStatus, CampaignTrackingConfig } from '@/lib/types'

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
  collab_status: CollabStatus
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

interface CampaignPostsGalleryProps {
  posts: PostRow[]
  trackingConfigs?: CampaignTrackingConfig[]
  workspaceId: string
  memberDriveUrl?: string
}

function getThumbnailSrc(post: PostRow): string | null {
  if (!post.thumbnail_url) return null
  if (post.platform === 'instagram') {
    return `/api/proxy-image?url=${encodeURIComponent(post.thumbnail_url)}`
  }
  return post.thumbnail_url
}

const platformVariant: Record<Platform, 'instagram' | 'tiktok' | 'youtube'> = {
  instagram: 'instagram',
  tiktok: 'tiktok',
  youtube: 'youtube',
}

const downloadDotClass: Record<DownloadStatus, string> = {
  downloaded: 'bg-brand',
  pending: 'bg-foreground-muted',
  blocked: 'bg-warning',
  failed: 'bg-destructive',
}

function MetricChip({
  icon: Icon,
  value,
}: {
  icon: React.ElementType
  value: string
}) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-foreground-muted">
      <Icon size={9} />
      {value}
    </span>
  )
}

function groupByMonth(posts: PostRow[]): { label: string; posts: PostRow[] }[] {
  const map: Record<string, PostRow[]> = {}
  for (const post of posts) {
    const key = new Date(post.posted_at).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
    ;(map[key] ??= []).push(post)
  }
  return Object.entries(map).map(([label, posts]) => ({ label, posts }))
}

function GalleryThumbnail({ post }: { post: PostRow }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hovering, setHovering] = useState(false)
  const src = getThumbnailSrc(post)
  const canPreview = !!post.media_url && post.platform !== 'youtube'

  function onEnter() {
    if (!canPreview) return
    setHovering(true)
    videoRef.current?.play()
  }
  function onLeave() {
    if (!canPreview) return
    setHovering(false)
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0 }
  }

  return (
    <div
      className="relative aspect-square bg-background-muted overflow-hidden"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className={cn('h-full w-full object-cover transition-opacity duration-200', hovering && canPreview ? 'opacity-0' : 'group-hover:scale-[1.03] transition-transform duration-300')}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <ImageOff size={20} className="text-foreground-muted" />
        </div>
      )}
      {canPreview && (
        <video
          ref={videoRef}
          src={post.media_url!}
          muted
          loop
          playsInline
          className={cn('absolute inset-0 h-full w-full object-cover transition-opacity duration-200', !hovering && 'opacity-0')}
        />
      )}
      {/* Platform badge — top left */}
      <div className="absolute left-2 top-2">
        <Badge variant={platformVariant[post.platform]}>{post.platform}</Badge>
      </div>
      {/* Download status dot — top right */}
      <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-black/40 px-1.5 py-0.5 backdrop-blur-sm">
        <span className={cn('h-1.5 w-1.5 rounded-full', downloadDotClass[post.download_status])} />
        <span className="text-[9px] font-semibold text-white capitalize">{post.download_status}</span>
      </div>
    </div>
  )
}

function PostDownloadButton({
  post,
}: {
  post: PostRow
  workspaceId: string
}) {
  if (post.download_status === 'blocked') {
    return (
      <span title="No usage rights granted">
        <Lock size={13} className="text-foreground-muted opacity-40" />
      </span>
    )
  }

  if (post.download_status === 'downloaded') {
    const driveUrl = post.drive_file_id
      ? `https://drive.google.com/file/d/${post.drive_file_id}/view`
      : null
    if (!driveUrl) return null
    return (
      <a
        href={driveUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title="View in Google Drive"
        className="flex h-6 w-6 items-center justify-center rounded-md text-brand transition-colors hover:bg-brand/10"
      >
        <ExternalLink size={12} />
      </a>
    )
  }

  return null
}

export function CampaignPostsGallery({
  posts,
  trackingConfigs = [],
  workspaceId,
  memberDriveUrl,
}: CampaignPostsGalleryProps) {
  const [selectedPost, setSelectedPost] = useState<PostRow | null>(null)

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background-muted">
          <Inbox size={18} className="text-foreground-muted" />
        </div>
        <p className="font-display text-[14px] font-bold text-foreground">No posts detected</p>
        <p className="max-w-xs text-[13px] text-foreground-lighter">
          Posts appear here as Ensemble finds them.
        </p>
      </div>
    )
  }

  const groups = groupByMonth(posts)

  return (
    <>
      <div className="flex flex-col gap-6 p-5">
        {groups.map(({ label, posts: groupPosts }) => (
          <div key={label}>
            {/* Group header */}
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[13px] font-semibold text-foreground">{label}</span>
              <span className="text-[12px] text-foreground-muted">
                · {groupPosts.length} {groupPosts.length === 1 ? 'post' : 'posts'}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4">
              {groupPosts.map((post) => (
                <div
                  key={post.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedPost(post)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedPost(post)}
                  className="group rounded-xl overflow-hidden border border-border bg-background-surface shadow-sm cursor-pointer transition-all hover:shadow-md hover:border-border-strong text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50"
                >
                  {/* Thumbnail + badges */}
                  <GalleryThumbnail post={post} />

                  {/* Info panel */}
                  <div className="p-3 flex flex-col gap-1">
                    <p className="text-[12px] font-semibold text-foreground truncate">
                      {post.influencer ? `@${getInfluencerLabel(post.influencer)}` : '—'}
                    </p>
                    <p className="text-[11px] text-foreground-muted">
                      {formatRelativeDate(post.posted_at)}
                    </p>

                    {/* Metrics + download action row */}
                    <div className="mt-0.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <MetricChip
                          icon={Eye}
                          value={post.metrics ? formatNumber(post.metrics.views) : '—'}
                        />
                        <MetricChip
                          icon={Percent}
                          value={post.metrics ? formatPercent(post.metrics.engagement_rate) : '—'}
                        />
                        <MetricChip
                          icon={DollarSign}
                          value={post.metrics ? formatEMV(post.metrics.emv) : '—'}
                        />
                      </div>
                      <PostDownloadButton post={post} workspaceId={workspaceId} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
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
