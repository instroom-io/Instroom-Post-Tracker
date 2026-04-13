'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowSquareOut, ImageBroken, Lock, CloudArrowUp, ArrowClockwise, Play } from '@phosphor-icons/react'
import { savePostToUserDrive } from '@/lib/actions/posts'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { formatNumber, formatEMV, formatPercent, formatRelativeDate, getInfluencerLabel } from '@/lib/utils'
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

interface PostDetailModalProps {
  post: PostRow | null
  onClose: () => void
  trackingConfigs: CampaignTrackingConfig[]
  workspaceId?: string
  memberDriveUrl?: string
}

const platformVariant: Record<Platform, 'instagram' | 'tiktok' | 'youtube'> = {
  instagram: 'instagram',
  tiktok: 'tiktok',
  youtube: 'youtube',
}

const downloadVariant: Record<DownloadStatus, 'muted' | 'success' | 'warning' | 'destructive'> = {
  pending: 'muted',
  downloaded: 'success',
  blocked: 'warning',
  failed: 'destructive',
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background-muted p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-[17px] font-extrabold text-foreground">{value}</p>
    </div>
  )
}

function ModalDownloadButton({ post, memberDriveUrl }: { post: PostRow; workspaceId: string; memberDriveUrl?: string }) {
  if (post.download_status === 'blocked') {
    return (
      <button
        disabled
        title="No usage rights granted"
        className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-foreground-muted opacity-50 cursor-not-allowed"
      >
        <Lock size={12} />
        Blocked
      </button>
    )
  }

  if (post.download_status === 'downloaded') {
    const driveHref = memberDriveUrl ?? (post.drive_file_id ? `https://drive.google.com/file/d/${post.drive_file_id}/view` : null)
    if (driveHref) {
      return (
        <a
          href={driveHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-background-muted transition-colors"
        >
          <ArrowSquareOut size={12} />
          Open in Drive
        </a>
      )
    }
  }

  return null
}

function ModalSaveToDriveButton({ postId, workspaceId, driveFileId }: {
  postId: string
  workspaceId: string
  driveFileId: string | null
}) {
  const [isPending, setIsPending] = useState(false)

  async function handleClick() {
    if (isPending) return
    setIsPending(true)
    const result = await savePostToUserDrive(postId, workspaceId)
    setIsPending(false)

    if ('error' in result) {
      if (result.error === 'connect_required') {
        toast.error('Connect Google Drive in Account Settings to use this feature.', {
          action: { label: 'Settings', onClick: () => window.open('/account/settings', '_blank') },
        })
      } else if (result.error === 'not_downloaded') {
        toast.error('This post has not been downloaded yet.')
      } else if (result.error === 'no_shared_drive_access') {
        toast.error('You need access to the agency Shared Drive first. Ask your agency admin to add your Google account as a Viewer on the Shared Drive.')
      } else {
        toast.error(result.error)
      }
      return
    }

    window.open(result.url, '_blank')
    toast.success('Saved to your Google Drive.')
  }

  return (
    <button
      type="button"
      disabled={isPending || !driveFileId}
      onClick={handleClick}
      title={driveFileId ? 'Save to My Drive' : 'Not yet downloaded'}
      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-background-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {isPending
        ? <ArrowClockwise size={12} className="animate-spin" />
        : <CloudArrowUp size={12} />
      }
      Save to My Drive
    </button>
  )
}

function getYouTubeId(url: string | null): string | null {
  if (!url) return null
  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/)
  return m?.[1] ?? null
}

function ModalThumbnail({ post }: { post: PostRow }) {
  const [playing, setPlaying] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const [videoSrcIdx, setVideoSrcIdx] = useState(0)

  // Build ordered fallback list: downloaded Drive file first, then raw CDN url.
  const videoSources = [
    post.drive_file_id ? `/api/proxy-drive?id=${post.drive_file_id}` : null,
    post.media_url,
  ].filter(Boolean) as string[]

  const videoSrc = videoSources[videoSrcIdx] ?? null
  const allSrcsFailed = playing && !videoSrc

  const youtubeId = post.platform === 'youtube' ? getYouTubeId(post.post_url) : null

  const isVideo =
    post.platform === 'tiktok' ||
    (post.platform === 'youtube' && !!youtubeId) ||
    (post.platform === 'instagram' && (!!post.media_url || !!post.drive_file_id))

  const thumbnailSrc = post.thumbnail_url
    ? post.platform !== 'youtube'
      ? `/api/proxy-image?url=${encodeURIComponent(post.thumbnail_url)}`
      : post.thumbnail_url
    : null

  return (
    <div className="relative h-[180px] w-[180px] overflow-hidden rounded-xl bg-background-muted flex items-center justify-center">
      {playing && youtubeId ? (
        // YouTube: always use iframe embed — <video> cannot play YouTube URLs
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
          title="YouTube video"
        />
      ) : playing && videoSrc ? (
        // TikTok / Instagram: try Drive proxy first, then fall back to media_url
        <video
          src={videoSrc}
          autoPlay
          controls
          loop
          playsInline
          className="h-full w-full object-cover"
          onError={() => setVideoSrcIdx((i) => i + 1)}
        />
      ) : allSrcsFailed ? (
        // All video sources exhausted — show a direct link to the platform post
        <a
          href={post.post_url ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center gap-2 text-center text-foreground-muted hover:text-foreground transition-colors p-4"
        >
          <ArrowSquareOut size={24} />
          <span className="text-[11px] font-medium">View on {post.platform}</span>
        </a>
      ) : (
        <>
          {thumbnailSrc && !imgFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailSrc}
              alt=""
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageBroken size={24} className="text-foreground-muted" />
          )}
          {isVideo && (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="absolute inset-0 flex items-center justify-center group"
              aria-label="Play video"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 transition-transform group-hover:scale-110">
                <Play size={16} weight="fill" className="text-white" />
              </div>
            </button>
          )}
        </>
      )}
    </div>
  )
}

export function PostDetailModal({ post, onClose, trackingConfigs, workspaceId, memberDriveUrl }: PostDetailModalProps) {
  // Detect which tracking hashtags/mentions appear in the caption
  const caption = post?.caption?.toLowerCase() ?? ''
  const matchedHashtags = post && caption
    ? trackingConfigs.flatMap((cfg) => cfg.hashtags).filter(
        (h, i, arr) => arr.indexOf(h) === i && caption.includes(`#${h}`.toLowerCase())
      )
    : []
  const matchedMentions = post && caption
    ? trackingConfigs.flatMap((cfg) => cfg.mentions).filter(
        (m, i, arr) => arr.indexOf(m) === i && caption.includes(`@${m}`.toLowerCase())
      )
    : []
  const hasMatches = matchedHashtags.length > 0 || matchedMentions.length > 0

  const m = post?.metrics
  const influencerLabel = post?.influencer ? getInfluencerLabel(post.influencer) : 'Unknown influencer'

  return (
    <Dialog open={post !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg" className="max-w-2xl">
        {post && (
          <>
            <DialogHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant={platformVariant[post.platform]}>{post.platform}</Badge>
                      <Badge variant={downloadVariant[post.download_status]}>{post.download_status}</Badge>
                    </div>
                    <DialogTitle>@{influencerLabel}</DialogTitle>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {workspaceId && <ModalDownloadButton post={post} workspaceId={workspaceId} memberDriveUrl={memberDriveUrl} />}
                    {workspaceId && (
                      <ModalSaveToDriveButton
                        postId={post.id}
                        workspaceId={workspaceId}
                        driveFileId={post.drive_file_id}
                      />
                    )}
                    {post.post_url && (
                      <a
                        href={post.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
                      >
                        <ArrowSquareOut size={11} />
                        Open post
                      </a>
                    )}
                  </div>
                </div>
                <DialogDescription>
                  {formatRelativeDate(post.posted_at)}
                </DialogDescription>
              </DialogHeader>

              <DialogBody className="p-0">
                <div className="flex flex-col gap-0 sm:flex-row">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 p-5 sm:pb-5 sm:pr-0">
                    <ModalThumbnail post={post} />
                  </div>

                  {/* Right side */}
                  <div className="flex flex-1 flex-col gap-4 p-5">
                    {/* Caption */}
                    <div>
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
                        Caption
                      </p>
                      {post.caption ? (
                        <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap line-clamp-5">
                          {post.caption}
                        </p>
                      ) : (
                        <p className="text-[12px] text-foreground-muted italic">No caption available</p>
                      )}
                    </div>

                    {/* Matched tracking keywords */}
                    {hasMatches && (
                      <div>
                        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
                          Matched tracking
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {matchedHashtags.map((h) => (
                            <span
                              key={`h-${h}`}
                              className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand"
                            >
                              #{h}
                            </span>
                          ))}
                          {matchedMentions.map((mention) => (
                            <span
                              key={`m-${mention}`}
                              className="inline-flex items-center rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand"
                            >
                              @{mention}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Metrics grid */}
                <div className="border-t border-border px-5 py-4">
                  <p className="mb-3 text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
                    Performance metrics
                  </p>
                  {m ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      <MetricCell label="Views" value={formatNumber(m.views)} />
                      <MetricCell label="Likes" value={formatNumber(m.likes)} />
                      <MetricCell label="Comments" value={formatNumber(m.comments)} />
                      <MetricCell label="Shares" value={formatNumber(m.shares)} />
                      {post.platform === 'instagram' && m.saves !== null && (
                        <MetricCell label="Saves" value={formatNumber(m.saves)} />
                      )}
                      <MetricCell label="Followers" value={formatNumber(m.follower_count)} />
                      <MetricCell label="ER%" value={formatPercent(m.engagement_rate)} />
                      <MetricCell label="EMV" value={formatEMV(m.emv)} />
                    </div>
                  ) : (
                    <p className="text-[12px] text-foreground-muted">
                      Metrics are fetched 7 days after publish and not yet available for this post.
                    </p>
                  )}
                </div>
              </DialogBody>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
