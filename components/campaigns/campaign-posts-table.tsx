'use client'

import { Badge } from '@/components/ui/badge'
import { formatRelativeDate, formatNumber, formatEMV, formatPercent } from '@/lib/utils'
import type { Platform, DownloadStatus, CollabStatus } from '@/lib/types'

interface PostRow {
  id: string
  thumbnail_url: string | null
  platform: Platform
  posted_at: string
  download_status: DownloadStatus
  collab_status: CollabStatus
  influencer: { full_name: string; ig_handle: string | null } | null
  metrics: {
    views: number
    engagement_rate: number
    emv: number
  } | null
}

interface CampaignPostsTableProps {
  posts: PostRow[]
  showCampaignColumn?: boolean
  campaignName?: string
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

export function CampaignPostsTable({ posts }: CampaignPostsTableProps) {
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
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="w-16 px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              Post
            </th>
            <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
              Influencer
            </th>
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
          {posts.map((post) => (
            <tr
              key={post.id}
              className="border-b border-border/50 transition-colors last:border-0 hover:bg-background-muted/30"
            >
              {/* Thumbnail */}
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
                <Badge variant={downloadVariant[post.download_status]}>
                  {post.download_status}
                </Badge>
              </td>

              <td className="px-5 py-3">
                {post.platform === 'instagram' && post.collab_status !== 'n/a' ? (
                  <Badge variant={collabVariant[post.collab_status as Exclude<CollabStatus, 'n/a'>]}>
                    {post.collab_status}
                  </Badge>
                ) : (
                  <span className="text-[12px] text-foreground-muted">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
