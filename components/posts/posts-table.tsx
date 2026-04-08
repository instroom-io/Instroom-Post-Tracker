'use client'

import { useState, useRef } from 'react'
import { Tray, ImageBroken, CloudArrowUp, ArrowClockwise, Play } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { savePostToUserDrive } from '@/lib/actions/posts'
import { cn } from '@/lib/utils'
import { PostsFilterBar } from './posts-filter-bar'
import { DownloadStatusBadge } from './download-status-badge'
import { Badge } from '@/components/ui/badge'
import { formatRelativeDate, formatNumber, formatEMV, formatPercent } from '@/lib/utils'
import type { Platform, DownloadStatus } from '@/lib/types'

interface PostRow {
  id: string
  thumbnail_url: string | null
  media_url: string | null
  platform: Platform
  posted_at: string
  download_status: DownloadStatus
  blocked_reason: string | null
  drive_file_id: string | null
  drive_folder_path: string | null
  influencer: { full_name: string; ig_handle: string | null } | null
  campaign: { id: string; name: string } | null
  metrics: {
    views: number
    engagement_rate: number
    emv: number
  } | null
}

interface Campaign {
  id: string
  name: string
}

interface PostsTableProps {
  posts: PostRow[]
  campaigns: Campaign[]
  showCampaignColumn?: boolean
  canEdit?: boolean
  workspaceId?: string
  timezone?: string
}

function SaveToDriveButton({ postId, workspaceId, driveFileId }: {
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
      title={driveFileId ? 'Save to My Drive' : 'Not yet downloaded'}
      disabled={isPending || !driveFileId}
      onClick={handleClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-background-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {isPending
        ? <ArrowClockwise size={13} className="animate-spin" />
        : <CloudArrowUp size={13} />
      }
    </button>
  )
}

function ThumbnailCell({ thumbnailUrl, mediaUrl, platform }: {
  thumbnailUrl: string | null
  mediaUrl: string | null
  platform: Platform
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hovering, setHovering] = useState(false)
  const canPreview = !!mediaUrl && platform !== 'youtube'

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
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0 }
  }

  return (
    <div
      className="relative h-10 w-10 overflow-hidden rounded-md bg-background-muted flex-shrink-0"
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={platform === 'instagram' ? `/api/proxy-image?url=${encodeURIComponent(thumbnailUrl)}` : thumbnailUrl}
          alt=""
          className={cn('h-full w-full object-cover transition-opacity duration-200', hovering && canPreview && 'opacity-0')}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <ImageBroken size={14} className="text-foreground-muted" aria-label="No thumbnail" />
        </div>
      )}
      {canPreview && (
        <video
          ref={videoRef}
          src={mediaUrl!}
          muted
          loop
          playsInline
          preload="none"
          className={cn('absolute inset-0 h-full w-full object-cover transition-opacity duration-200', !hovering && 'opacity-0')}
        />
      )}
      {(platform === 'tiktok' || platform === 'youtube' || (platform === 'instagram' && !!mediaUrl)) && !hovering && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-black/50">
            <Play size={7} weight="fill" className="text-white" />
          </div>
        </div>
      )}
    </div>
  )
}

const platformVariant: Record<Platform, 'instagram' | 'tiktok' | 'youtube'> = {
  instagram: 'instagram',
  tiktok: 'tiktok',
  youtube: 'youtube',
}

export function PostsTable({
  posts,
  campaigns,
  showCampaignColumn = false,
  canEdit = false,
  workspaceId,
  timezone,
}: PostsTableProps) {
  const [filters, setFilters] = useState({
    platform: 'all' as Platform | 'all',
    campaignId: 'all',
    downloadStatus: 'all' as DownloadStatus | 'all',
  })

  const filtered = posts.filter((p) => {
    if (filters.platform !== 'all' && p.platform !== filters.platform) return false
    if (filters.campaignId !== 'all' && p.campaign?.id !== filters.campaignId) return false
    if (filters.downloadStatus !== 'all' && p.download_status !== filters.downloadStatus) return false
    return true
  })

  const activeFilterChips = [
    filters.platform !== 'all' && { key: 'platform' as const, label: filters.platform },
    filters.campaignId !== 'all' && {
      key: 'campaignId' as const,
      label: campaigns.find((c) => c.id === filters.campaignId)?.name ?? filters.campaignId,
    },
    filters.downloadStatus !== 'all' && { key: 'downloadStatus' as const, label: filters.downloadStatus },
  ].filter(Boolean) as { key: 'platform' | 'campaignId' | 'downloadStatus'; label: string }[]

  function clearFilter(key: typeof activeFilterChips[number]['key']) {
    setFilters((prev) => ({ ...prev, [key]: 'all' }))
  }

  function clearAll() {
    setFilters({ platform: 'all', campaignId: 'all', downloadStatus: 'all' })
  }

  const isFiltered = activeFilterChips.length > 0

  return (
    <div className="space-y-4">
      <PostsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        campaigns={campaigns}
      />

      {/* Active filter chips */}
      {isFiltered && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilterChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-medium text-brand"
            >
              {chip.label}
              <button
                type="button"
                onClick={() => clearFilter(chip.key)}
                aria-label={`Remove ${chip.label} filter`}
                className="ml-0.5 rounded-full hover:opacity-70"
              >
                ×
              </button>
            </span>
          ))}
          {activeFilterChips.length >= 2 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] text-foreground-muted hover:text-foreground underline"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Result count */}
      {posts.length > 0 && (
        <p className="text-[12px] text-foreground-lighter">
          {isFiltered
            ? `Showing ${filtered.length} of ${posts.length} posts`
            : `${posts.length} post${posts.length === 1 ? '' : 's'}`}
        </p>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center rounded-xl border border-border bg-background-surface">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background-muted">
            <Tray size={22} className="text-foreground-muted" />
          </div>
          <div>
            <p className="font-display text-[14px] font-bold text-foreground">No posts detected</p>
            <p className="mt-1 max-w-xs text-[13px] text-foreground-lighter">
              Posts appear here as Ensemble finds them.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background-surface shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="w-16 px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-lighter">
                  Post
                </th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-lighter">
                  Influencer
                </th>
                {showCampaignColumn && (
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-lighter">
                    Campaign
                  </th>
                )}
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-lighter">
                  Platform
                </th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-lighter">
                  Posted
                </th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-foreground-lighter">
                  Views
                </th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-foreground-lighter">
                  ER
                </th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-foreground-lighter">
                  EMV
                </th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-lighter">
                  Download
                </th>
                {workspaceId && (
                  <th className="w-10 px-2 py-2.5" />
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((post) => (
                <tr
                  key={post.id}
                  className="border-b border-border/50 transition-colors last:border-0 hover:bg-background-muted/30"
                >
                  <td className="px-5 py-3">
                    <ThumbnailCell
                      thumbnailUrl={post.thumbnail_url}
                      mediaUrl={post.media_url}
                      platform={post.platform}
                    />
                  </td>

                  <td className="px-5 py-3">
                    <p className="text-[12px] font-medium text-foreground">
                      {post.influencer?.full_name ?? '—'}
                    </p>
                    {post.influencer?.ig_handle && (
                      <p className="text-[11px] text-foreground-lighter">
                        @{post.influencer.ig_handle}
                      </p>
                    )}
                  </td>

                  {showCampaignColumn && (
                    <td className="px-5 py-3 text-[12px] text-foreground-lighter">
                      {post.campaign?.name ?? '—'}
                    </td>
                  )}

                  <td className="px-5 py-3">
                    <Badge variant={platformVariant[post.platform]}>
                      {post.platform}
                    </Badge>
                  </td>

                  <td className="px-5 py-3 text-[12px] text-foreground-lighter">
                    {formatRelativeDate(post.posted_at, timezone)}
                  </td>

                  <td className="px-5 py-3 text-right text-[12px] text-foreground">
                    {post.metrics ? formatNumber(post.metrics.views) : '—'}
                  </td>

                  <td className="px-5 py-3 text-right text-[12px] text-foreground">
                    {post.metrics
                      ? formatPercent(post.metrics.engagement_rate)
                      : '—'}
                  </td>

                  <td className="px-5 py-3 text-right text-[12px] text-foreground">
                    {post.metrics ? formatEMV(post.metrics.emv) : '—'}
                  </td>

                  <td className="px-5 py-3">
                    <DownloadStatusBadge
                      status={post.download_status}
                      blockedReason={post.blocked_reason}
                      driveFolderPath={post.drive_folder_path}
                    />
                  </td>

                  {workspaceId && (
                    <td className="px-2 py-3">
                      <SaveToDriveButton
                        postId={post.id}
                        workspaceId={workspaceId}
                        driveFileId={post.drive_file_id}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
