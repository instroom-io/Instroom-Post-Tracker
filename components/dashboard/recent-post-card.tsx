'use client'

import { useRef, useState } from 'react'
import { ImageBroken } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { cn, formatRelativeDate, getInfluencerLabel } from '@/lib/utils'
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

const platformVariant: Record<Platform, 'instagram' | 'tiktok' | 'youtube'> = {
  instagram: 'instagram',
  tiktok: 'tiktok',
  youtube: 'youtube',
}

export function RecentPostCard({ post, workspaceId }: { post: Post; workspaceId?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hovering, setHovering] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  // Track fallback: Drive proxy first, media_url second.
  const [primarySrcFailed, setPrimarySrcFailed] = useState(false)
  const [previewDisabled, setPreviewDisabled] = useState(false)

  const videoSrc = primarySrcFailed
    ? post.media_url
    : post.drive_file_id
      ? `/api/proxy-drive?id=${post.drive_file_id}${workspaceId ? `&workspaceId=${workspaceId}` : ''}`
      : post.media_url

  const isVideo = post.platform === 'tiktok' || post.platform === 'youtube' || (post.platform === 'instagram' && (!!post.media_url || !!post.drive_file_id))
  const canPreview = isVideo && !!videoSrc && post.platform !== 'youtube' && !previewDisabled

  function onEnter() {
    if (!canPreview) return
    setHovering(true)
    const video = videoRef.current
    if (!video) return
    video.load()
    video.play().catch(() => {})
  }

  function onLeave() {
    if (!canPreview) return
    setHovering(false)
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  function handleVideoError() {
    if (!primarySrcFailed && post.drive_file_id) {
      setPrimarySrcFailed(true)
    } else {
      setPreviewDisabled(true)
    }
  }

  const thumbnailSrc = post.thumbnail_url
    ? post.platform !== 'youtube' && !post.thumbnail_url.includes('supabase.co')
      ? `/api/proxy-image?url=${encodeURIComponent(post.thumbnail_url)}`
      : post.thumbnail_url
    : null

  return (
    <div
      className="group relative overflow-hidden rounded-lg border border-border bg-background-muted"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Thumbnail + video */}
      <div className="aspect-square w-full bg-background-muted">
        {thumbnailSrc && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailSrc}
            alt={`Post by @${post.influencer ? getInfluencerLabel(post.influencer) : 'influencer'} on ${post.platform}, ${formatRelativeDate(post.posted_at)}`}
            onError={() => setImgFailed(true)}
            className={cn('h-full w-full object-cover transition-opacity duration-200', hovering && canPreview && 'opacity-0')}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageBroken size={20} className="text-foreground-muted" aria-label="No thumbnail" />
          </div>
        )}
        {canPreview && (
          <video
            ref={videoRef}
            src={videoSrc!}
            muted
            loop
            playsInline
            preload={imgFailed ? 'metadata' : 'none'}
            onError={handleVideoError}
            className={cn('absolute inset-0 h-full w-full object-cover transition-opacity duration-200', !hovering && !imgFailed && 'opacity-0')}
          />
        )}
      </div>

      {/* Hover info overlay */}
      <div className="absolute inset-0 flex flex-col justify-between p-2 opacity-0 transition-opacity group-hover:opacity-100 bg-black/40">
        <Badge variant={platformVariant[post.platform]} className="self-start">
          {post.platform}
        </Badge>
        <div>
          <p className="text-[11px] font-medium text-white truncate">
            @{post.influencer ? getInfluencerLabel(post.influencer) : 'Unknown'}
          </p>
          <p className="text-[10px] text-white/70">
            {formatRelativeDate(post.posted_at)}
          </p>
        </div>
      </div>

      {/* Always-visible platform badge (fades on hover) */}
      <div className="absolute left-2 top-2 group-hover:opacity-0 transition-opacity">
        <Badge variant={platformVariant[post.platform]} className="self-start">
          {post.platform}
        </Badge>
      </div>
    </div>
  )
}
