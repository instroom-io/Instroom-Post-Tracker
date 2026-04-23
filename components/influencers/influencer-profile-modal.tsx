'use client'

import { useState, useEffect } from 'react'
import { Check, Minus, Eye, ImageBroken, FolderSimple, ArrowSquareOut } from '@phosphor-icons/react'
import { getInfluencerProfile } from '@/lib/actions/influencers'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { PlatformIcon } from '@/components/ui/platform-icon'
import { cn, getInfluencerLabel, getInitials, formatNumber, formatEMV, formatPercent } from '@/lib/utils'
import type {
  InfluencerProfile,
  InfluencerProfileCampaign,
  InfluencerProfilePost,
  CampaignStatus,
  MonitoringStatus,
  Platform,
} from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface InfluencerProfileModalProps {
  influencer: {
    id: string
    ig_handle: string | null
    tiktok_handle: string | null
    youtube_handle: string | null
    profile_pic_url: string | null
  } | null
  workspaceId: string
  workspaceDriveFolderId: string | null
  onClose: () => void
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background-muted p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-foreground-muted">{label}</p>
      <p className="mt-1 font-display text-[17px] font-extrabold text-foreground">{value}</p>
    </div>
  )
}

const MONITORING_LABEL: Record<MonitoringStatus, string> = {
  pending: 'Pending',
  active: 'Monitoring',
  paused: 'Paused',
  removed: 'Removed',
  stopped: 'Stopped',
}

const CAMPAIGN_STATUS_BADGE: Record<CampaignStatus, 'active' | 'draft' | 'ended' | 'muted'> = {
  active: 'active',
  draft: 'draft',
  ended: 'ended',
  archived: 'muted',
}

function CampaignRow({ campaign }: { campaign: InfluencerProfileCampaign }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-background-muted/50">
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full',
          campaign.status === 'active' ? 'bg-brand' : 'bg-foreground-muted/40'
        )}
      />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {campaign.name}
      </span>
      <Badge variant={CAMPAIGN_STATUS_BADGE[campaign.status]} className="shrink-0">
        {campaign.status}
      </Badge>
      <span className="shrink-0 text-[11px] text-foreground-muted">
        {MONITORING_LABEL[campaign.monitoring_status]}
      </span>
      {campaign.usage_rights ? (
        <Check size={13} className="shrink-0 text-brand" />
      ) : (
        <Minus size={13} className="shrink-0 text-foreground-muted/40" />
      )}
    </div>
  )
}

function PostTile({ post }: { post: InfluencerProfilePost }) {
  const [imgError, setImgError] = useState(false)

  const proxyUrl = post.thumbnail_url
    ? post.platform !== 'youtube' && !post.thumbnail_url.includes('supabase.co')
      ? `/api/proxy-image?url=${encodeURIComponent(post.thumbnail_url)}`
      : post.thumbnail_url
    : null

  return (
    <button
      onClick={() => post.post_url && window.open(post.post_url, '_blank')}
      disabled={!post.post_url}
      className="group relative aspect-square overflow-hidden rounded-lg bg-background-muted"
    >
      {proxyUrl && !imgError ? (
        <img
          src={proxyUrl}
          alt=""
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <ImageBroken size={16} className="text-foreground-muted/40" />
        </div>
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
        {post.views !== null && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-white">
            <Eye size={11} />
            {formatNumber(post.views)}
          </span>
        )}
        {post.emv !== null && (
          <span className="text-[10px] text-white/80">{formatEMV(post.emv)}</span>
        )}
      </div>
    </button>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InfluencerProfileModal({
  influencer,
  workspaceId,
  workspaceDriveFolderId,
  onClose,
}: InfluencerProfileModalProps) {
  const [profile, setProfile] = useState<InfluencerProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)

  useEffect(() => {
    if (!influencer) {
      setProfile(null)
      setAvatarFailed(false)
      return
    }
    setAvatarFailed(false)
    setLoading(true)
    setProfile(null)
    getInfluencerProfile(workspaceId, influencer.id).then((result) => {
      if (!('error' in result)) setProfile(result)
      setLoading(false)
    })
  }, [influencer?.id, workspaceId])

  const label = influencer ? getInfluencerLabel(influencer) : ''

  const handles = influencer
    ? ([
        influencer.tiktok_handle
          ? { platform: 'tiktok' as Platform, handle: influencer.tiktok_handle }
          : null,
        influencer.ig_handle
          ? { platform: 'instagram' as Platform, handle: influencer.ig_handle }
          : null,
        influencer.youtube_handle
          ? { platform: 'youtube' as Platform, handle: influencer.youtube_handle }
          : null,
      ].filter(Boolean) as { platform: Platform; handle: string }[])
    : []

  const totalPosts = profile?.platformStats.reduce((s, p) => s + p.post_count, 0) ?? null
  const totalViews = profile?.platformStats.reduce((s, p) => s + p.total_views, 0) ?? null
  const totalEmv = profile?.platformStats.reduce((s, p) => s + p.total_emv, 0) ?? null
  const avgEr =
    profile && profile.platformStats.length > 0
      ? profile.platformStats.reduce((s, p) => s + p.avg_er, 0) / profile.platformStats.length
      : null

  return (
    <Dialog open={influencer !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-start gap-4 px-6 pb-4 pr-12 pt-5">
          {influencer?.profile_pic_url && !avatarFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                influencer.profile_pic_url.startsWith('/api/')
                  ? influencer.profile_pic_url
                  : `/api/proxy-image?url=${encodeURIComponent(influencer.profile_pic_url)}`
              }
              alt={label}
              onError={() => setAvatarFailed(true)}
              className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-border"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-muted to-brand/20 font-display text-lg font-bold text-brand ring-2 ring-border">
              {getInitials(label)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-bold leading-none text-foreground">
              @{label}
            </p>
            {handles.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {handles.map((h) => (
                  <span
                    key={h.platform}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-foreground-muted',
                      h.platform === 'instagram' && 'bg-purple-50 dark:bg-purple-500/10',
                      h.platform === 'tiktok' && 'bg-blue-50 dark:bg-blue-500/10',
                      h.platform === 'youtube' && 'bg-red-50 dark:bg-red-500/10',
                    )}
                  >
                    <PlatformIcon platform={h.platform} size={11} />
                    {handles.length > 1 && `@${h.handle}`}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center gap-2 text-[11px] text-foreground-muted">
              {profile ? (
                <>
                  <span>
                    {totalPosts} {totalPosts === 1 ? 'post' : 'posts'}
                  </span>
                  <span className="text-border">·</span>
                  <span>
                    {profile.campaigns.length}{' '}
                    {profile.campaigns.length === 1 ? 'campaign' : 'campaigns'}
                  </span>
                </>
              ) : (
                <span className="skeleton h-3 w-28 rounded" />
              )}
            </div>
            {workspaceDriveFolderId && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                <FolderSimple size={12} className="shrink-0 text-foreground-muted" />
                <a
                  href={`https://drive.google.com/drive/folders/${workspaceDriveFolderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-brand hover:underline"
                >
                  Posts saved to Drive
                  <ArrowSquareOut size={10} className="shrink-0" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="max-h-[calc(100dvh-180px)] overflow-y-auto sm:max-h-[calc(100dvh-220px)]">
          {/* Performance */}
          <div className="border-t border-border px-6 py-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
              Performance
            </p>
            {loading ? (
              <div className="grid grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-14 rounded-lg" />
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetricCell
                    label="Total Posts"
                    value={totalPosts !== null ? String(totalPosts) : '—'}
                  />
                  <MetricCell
                    label="Total Views"
                    value={totalViews !== null ? formatNumber(totalViews) : '—'}
                  />
                  <MetricCell
                    label="Avg ER%"
                    value={avgEr !== null ? formatPercent(avgEr) : '—'}
                  />
                  <MetricCell
                    label="Total EMV"
                    value={totalEmv !== null ? formatEMV(totalEmv) : '—'}
                  />
                </div>

                {profile && profile.platformStats.length > 1 && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-border">
                    {profile.platformStats.map((ps, i) => (
                      <div
                        key={ps.platform}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5 text-[12px]',
                          i > 0 && 'border-t border-border/60'
                        )}
                      >
                        <PlatformIcon platform={ps.platform} size={13} />
                        <span className="w-20 font-medium capitalize text-foreground">
                          {ps.platform}
                        </span>
                        <span className="text-foreground-muted">{ps.post_count} posts</span>
                        <span className="ml-auto text-foreground-muted">
                          {formatNumber(ps.total_views)} views
                        </span>
                        <span className="w-20 text-right text-foreground-muted">
                          {formatEMV(ps.total_emv)} EMV
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Campaigns */}
          <div className="border-t border-border px-6 py-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
              Campaigns{profile ? ` (${profile.campaigns.length})` : ''}
            </p>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton h-8 rounded-md" />
                ))}
              </div>
            ) : !profile || profile.campaigns.length === 0 ? (
              <p className="text-sm text-foreground-muted">Not in any active campaigns.</p>
            ) : (
              <div className="space-y-0.5">
                {profile.campaigns.map((c) => (
                  <CampaignRow key={c.campaign_influencer_id} campaign={c} />
                ))}
              </div>
            )}
          </div>

          {/* Recent Posts */}
          <div className="border-t border-border px-6 py-4 pb-6">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
              Recent Posts
            </p>
            {loading ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="skeleton aspect-square rounded-lg" />
                ))}
              </div>
            ) : !profile || profile.recentPosts.length === 0 ? (
              <p className="text-sm text-foreground-muted">No posts recorded yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {profile.recentPosts.map((post) => (
                  <PostTile key={post.id} post={post} />
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
