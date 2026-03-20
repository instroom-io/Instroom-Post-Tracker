'use client'

import { useState } from 'react'
import { Download, Inbox } from 'lucide-react'
import { CampaignPostsTable } from './campaign-posts-table'
import { CampaignPostsGallery } from './campaign-posts-gallery'
import { CampaignInfluencersList } from './campaign-influencers-list'
import { TrackingConfigPanel } from './tracking-config-panel'
import { AddInfluencerToCampaignDialog } from './add-influencer-to-campaign-dialog'
import { formatNumber, formatEMV, cn } from '@/lib/utils'
import type { Platform, DownloadStatus, CollabStatus, CampaignTrackingConfig } from '@/lib/types'

interface PostRow {
  id: string
  thumbnail_url: string | null
  caption: string | null
  post_url: string | null
  platform: Platform
  posted_at: string
  download_status: DownloadStatus
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

interface InfluencerRow {
  id: string
  usage_rights: boolean
  monitoring_status: string
  influencer: {
    id: string
    ig_handle: string | null
    tiktok_handle: string | null
    youtube_handle: string | null
  }
}

interface WorkspaceInfluencer {
  id: string
  ig_handle: string | null
  tiktok_handle: string | null
  youtube_handle: string | null
}

interface CampaignTabsProps {
  posts: PostRow[]
  downloadedPosts: PostRow[]
  influencers: InfluencerRow[]
  workspaceInfluencers: WorkspaceInfluencer[]
  trackingConfigs: CampaignTrackingConfig[]
  workspaceId: string
  campaignId: string
  campaignPlatforms: Platform[]
  canEdit: boolean
  postCountsByInfluencerId: Record<string, number>
}

type Tab = 'overview' | 'influencers' | 'posts' | 'downloads'

export function CampaignTabs({
  posts,
  downloadedPosts,
  influencers,
  workspaceInfluencers,
  trackingConfigs,
  workspaceId,
  campaignId,
  campaignPlatforms,
  canEdit,
  postCountsByInfluencerId,
}: CampaignTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Compute summary metrics from already-fetched posts
  const totalViews = posts.reduce((sum, p) => sum + (p.metrics?.views ?? 0), 0)
  const totalEmv = posts.reduce((sum, p) => sum + (p.metrics?.emv ?? 0), 0)

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'influencers', label: 'Influencers', count: influencers.length },
    { key: 'posts', label: 'Posts', count: posts.length },
    { key: 'downloads', label: 'Downloads', count: downloadedPosts.length },
  ]


  const campaignInfluencerIds = new Set(influencers.map((i) => i.influencer.id))
  const availableInfluencers = workspaceInfluencers.filter(
    (inf) => !campaignInfluencerIds.has(inf.id)
  )

  return (
    <div className="flex flex-col gap-0">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border px-5">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'mr-1 inline-flex items-center gap-1.5 border-b-2 px-3 py-3 text-[13px] transition-colors',
              activeTab === tab.key
                ? 'border-brand font-semibold text-foreground'
                : 'border-transparent font-medium text-foreground-muted hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  activeTab === tab.key
                    ? 'bg-brand/10 text-brand'
                    : 'bg-background-muted text-foreground-muted'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="p-5">
        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-5">
            {/* Summary metric cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-background-surface p-4 shadow-sm">
                <p className="text-[11px] font-medium text-foreground-lighter">Posts detected</p>
                <p className="mt-1 font-display text-[22px] font-extrabold text-foreground">
                  {posts.length}
                </p>
                <p className="mt-0.5 text-[11px] text-foreground-muted">via Ensemble</p>
              </div>
              <div className="rounded-xl border border-border bg-background-surface p-4 shadow-sm">
                <p className="text-[11px] font-medium text-foreground-lighter">Downloaded</p>
                <p className="mt-1 font-display text-[22px] font-extrabold text-foreground">
                  {downloadedPosts.length}
                </p>
                <p className="mt-0.5 text-[11px] text-foreground-muted">
                  {posts.length > 0
                    ? `of ${posts.length} posts`
                    : 'no posts yet'}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background-surface p-4 shadow-sm">
                <p className="text-[11px] font-medium text-foreground-lighter">Total views</p>
                <p className="mt-1 font-display text-[22px] font-extrabold text-foreground">
                  {formatNumber(totalViews)}
                </p>
                <p className="mt-0.5 text-[11px] text-foreground-muted">across all posts</p>
              </div>
              <div className="rounded-xl border border-border bg-background-surface p-4 shadow-sm">
                <p className="text-[11px] font-medium text-foreground-lighter">Total EMV</p>
                <p className="mt-1 font-display text-[22px] font-extrabold text-foreground">
                  {formatEMV(totalEmv)}
                </p>
                <p className="mt-0.5 text-[11px] text-foreground-muted">estimated value</p>
              </div>
            </div>

            {/* Tracking config */}
            <div className="rounded-xl border border-border bg-background-surface shadow-sm">
              <div className="border-b border-border px-5 py-3.5">
                <h2 className="font-display text-[15px] font-bold text-foreground">
                  Tracking config
                </h2>
              </div>
              <TrackingConfigPanel
                campaignId={campaignId}
                workspaceId={workspaceId}
                platforms={campaignPlatforms}
                configs={trackingConfigs}
                canEdit={canEdit}
              />
            </div>
          </div>
        )}

        {/* ── Influencers ── */}
        {activeTab === 'influencers' && (
          <div className="rounded-xl border border-border bg-background-surface shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <h2 className="font-display text-[15px] font-bold text-foreground">Influencers</h2>
              {canEdit && (
                <AddInfluencerToCampaignDialog
                  workspaceId={workspaceId}
                  campaignId={campaignId}
                  availableInfluencers={availableInfluencers}
                />
              )}
            </div>
            <CampaignInfluencersList
              items={influencers}
              workspaceId={workspaceId}
              campaignId={campaignId}
              canEdit={canEdit}
              postCountsByInfluencerId={postCountsByInfluencerId}
            />
          </div>
        )}

        {/* ── Posts ── */}
        {activeTab === 'posts' && (
          <div className="rounded-xl border border-border bg-background-surface shadow-sm">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="font-display text-[15px] font-bold text-foreground">Posts</h2>
              <p className="text-[11px] text-foreground-lighter">{posts.length} detected</p>
            </div>
            <CampaignPostsGallery posts={posts} trackingConfigs={trackingConfigs} />
          </div>
        )}

        {/* ── Downloads ── */}
        {activeTab === 'downloads' && (
          <div className="rounded-xl border border-border bg-background-surface shadow-sm">
            <div className="border-b border-border px-5 py-3.5">
              <h2 className="font-display text-[15px] font-bold text-foreground">Downloads</h2>
              <p className="text-[11px] text-foreground-lighter">
                {downloadedPosts.length} of {posts.length} posts downloaded to Drive
              </p>
            </div>
            {downloadedPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-background-muted">
                  <Download size={18} className="text-foreground-muted" />
                </div>
                <p className="font-display text-[14px] font-bold text-foreground">
                  No downloads yet
                </p>
                <p className="max-w-xs text-[13px] text-foreground-lighter">
                  Enable usage rights for an influencer to allow their posts to be downloaded to Drive.
                </p>
              </div>
            ) : (
              <CampaignPostsTable posts={downloadedPosts} trackingConfigs={trackingConfigs} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
