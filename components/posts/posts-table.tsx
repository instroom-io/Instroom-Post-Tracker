'use client'

import { useState } from 'react'
import { PostsFilterBar } from './posts-filter-bar'
import { DownloadStatusBadge } from './download-status-badge'
import { CollabStatusSelect } from './collab-status-select'
import { Badge } from '@/components/ui/badge'
import { formatRelativeDate, formatNumber, formatEMV, formatPercent } from '@/lib/utils'
import type { Platform, DownloadStatus, CollabStatus } from '@/lib/types'

interface PostRow {
  id: string
  thumbnail_url: string | null
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

  return (
    <div className="space-y-4">
      <PostsFilterBar
        filters={filters}
        onFilterChange={setFilters}
        campaigns={campaigns}
      />

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center rounded-xl border border-border bg-background-surface">
          <div className="text-4xl">📭</div>
          <p className="font-display text-[15px] font-bold text-foreground">
            No posts detected
          </p>
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
                    <div className="h-10 w-10 overflow-hidden rounded-md bg-background-muted flex-shrink-0">
                      {post.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={post.thumbnail_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-foreground-muted text-sm">
                          🖼
                        </div>
                      )}
                    </div>
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
