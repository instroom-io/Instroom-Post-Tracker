'use client'

import { useTransition } from 'react'
import { ExternalLink, ImageOff, Download, Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { triggerPostDownload } from '@/lib/actions/download'
import { cn, formatNumber, formatEMV, formatPercent, formatRelativeDate, getInfluencerLabel } from '@/lib/utils'
import type { Platform, DownloadStatus, CollabStatus, CampaignTrackingConfig } from '@/lib/types'

interface PostRow {
  id: string
  thumbnail_url: string | null
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

const collabVariant: Record<
  Exclude<CollabStatus, 'n/a'>,
  'muted' | 'success' | 'destructive'
> = {
  pending: 'muted',
  confirmed: 'success',
  not_added: 'destructive',
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

function ModalDownloadButton({ post, workspaceId, memberDriveUrl }: { post: PostRow; workspaceId: string; memberDriveUrl?: string }) {
  const [isPending, startTransition] = useTransition()

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
          <ExternalLink size={12} />
          Open in Drive
        </a>
      )
    }
  }

  function handleDownload() {
    startTransition(async () => {
      const result = await triggerPostDownload(post.id, workspaceId)
      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Saved to Drive')
        window.open(result.driveUrl, '_blank')
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isPending}
      className={cn(
        'inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium transition-colors',
        isPending
          ? 'cursor-wait text-foreground-muted'
          : 'text-foreground hover:bg-background-muted'
      )}
    >
      {isPending ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
      {post.download_status === 'failed' ? 'Retry download' : 'Download'}
    </button>
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
                      {post.platform === 'instagram' && post.collab_status !== 'n/a' && (
                        <Badge variant={collabVariant[post.collab_status as Exclude<CollabStatus, 'n/a'>]}>
                          collab: {post.collab_status}
                        </Badge>
                      )}
                    </div>
                    <DialogTitle>@{influencerLabel}</DialogTitle>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {workspaceId && <ModalDownloadButton post={post} workspaceId={workspaceId} memberDriveUrl={memberDriveUrl} />}
                    {post.post_url && (
                      <a
                        href={post.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-brand hover:underline"
                      >
                        <ExternalLink size={11} />
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
                    <div className="h-[180px] w-[180px] overflow-hidden rounded-xl bg-background-muted flex items-center justify-center">
                      {post.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={
                            post.platform === 'instagram'
                              ? `/api/proxy-image?url=${encodeURIComponent(post.thumbnail_url)}`
                              : post.thumbnail_url
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageOff size={24} className="text-foreground-muted" />
                      )}
                    </div>
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
                      {post.post_url && (
                        <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="block">
                          <div className="rounded-lg bg-background-muted p-3 h-full flex flex-col justify-between hover:bg-background-muted/70 transition-colors cursor-pointer">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-foreground-muted">Source</p>
                            <div className="mt-1 flex items-center gap-1 text-brand">
                              <ExternalLink size={13} />
                              <span className="font-display text-[15px] font-extrabold">Open</span>
                            </div>
                          </div>
                        </a>
                      )}
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
