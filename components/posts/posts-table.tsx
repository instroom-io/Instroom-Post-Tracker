'use client'

import { useState, useRef } from 'react'
import { Inbox, ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PostsFilterBar } from './posts-filter-bar'
import { DownloadStatusBadge } from './download-status-badge'
import { CollabStatusSelect } from './collab-status-select'
import { Badge } from '@/components/ui/badge'
import { formatRelativeDate, formatNumber, formatEMV, formatPercent } from '@/lib/utils'
import type { Platform, DownloadStatus, CollabStatus } from '@/lib/types'

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
  collab_status: CollabStatus
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
          src={thumbnailUrl}
          alt=""
          className={cn('h-full w-full object-cover transition-opacity duration-200', hovering && canPreview && 'opacity-0')}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <ImageOff size={14} className="text-foreground-muted" aria-label="No thumbnail" />
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
}: PostsTableProps) {
  const [filters, setFilters] = useState({
    platform: 'all' as Platform | 'all',
    campaignId: 'all',
    downloadStatus: 'all' as DownloadStatus | 'all',
    collabStatus: 'all' as CollabStatus | 'all',
  })

  const filtered = posts.filter((p) => {
    if (filters.platform !== 'all' && p.platform !== filters.platform) return false
    if (filters.campaignId !== 'all' && p.campaign?.id !== filters.campaignId) return false
    if (filters.downloadStatus !== 'all' && p.download_status !== filters.downloadStatus) return false
    if (filters.collabStatus !== 'all' && p.collab_status !== filters.collabStatus) return false
    return true
  })

  const activeFilterChips = [
    filters.platform !== 'all' && { key: 'platform' as const, label: filters.platform },
    filters.campaignId !== 'all' && {
      key: 'campaignId' as const,
      label: campaigns.find((c) => c.id === filters.campaignId)?.name ?? filters.campaignId,
    },
    filters.downloadStatus !== 'all' && { key: 'downloadStatus' as const, label: filters.downloadStatus },
    filters.collabStatus !== 'all' && { key: 'collabStatus' as const, label: filters.collabStatus },
  ].filter(Boolean) as { key: 'platform' | 'campaignId' | 'downloadStatus' | 'collabStatus'; label: string }[]

  function clearFilter(key: typeof activeFilterChips[number]['key']) {
    setFilters((prev) => ({ ...prev, [key]: 'all' }))
  }

  function clearAll() {
    setFilters({ platform: 'all', campaignId: 'all', downloadStatus: 'all', collabStatus: 'all' })
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
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-center rounded-xl border border-border bg-background-surface">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background-muted">
            <Inbox size={18} className="text-foreground-muted" />
          </div>
          <p className="font-display text-[14px] font-bold text-foreground">No posts detected</p>
          <p className="max-w-xs text-[13px] text-foreground-lighter">
            Posts appear here as Ensemble finds them.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background-surface shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="w-16 px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Post
                </th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Influencer
                </th>
                {showCampaignColumn && (
                  <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                    Campaign
                  </th>
                )}
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Platform
                </th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Posted
                </th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Views
                </th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  ER
                </th>
                <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  EMV
                </th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Download
                </th>
                <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                  Collab
                </th>
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
                    {formatRelativeDate(post.posted_at)}
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

                  <td className="px-5 py-3">
                    <CollabStatusSelect
                      postId={post.id}
                      currentStatus={post.collab_status}
                      platform={post.platform}
                      canEdit={canEdit}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
