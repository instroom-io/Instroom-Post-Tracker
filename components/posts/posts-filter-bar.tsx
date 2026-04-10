'use client'

import { Select } from '@/components/ui/select'
import type { Platform, DownloadStatus } from '@/lib/types'

interface PostFilters {
  platform: Platform | 'all'
  campaignId: string | 'all'
  downloadStatus: DownloadStatus | 'all'
}

interface Campaign {
  id: string
  name: string
}

interface PostsFilterBarProps {
  filters: PostFilters
  onFilterChange: (filters: PostFilters) => void
  campaigns: Campaign[]
}

export function PostsFilterBar({
  filters,
  onFilterChange,
  campaigns,
}: PostsFilterBarProps) {
  function update<K extends keyof PostFilters>(key: K, value: PostFilters[K]) {
    onFilterChange({ ...filters, [key]: value })
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="w-full sm:w-36">
        <Select
          value={filters.platform}
          onChange={(e) =>
            update('platform', e.target.value as PostFilters['platform'])
          }
          options={[
            { value: 'all', label: 'All platforms' },
            { value: 'instagram', label: 'Instagram' },
            { value: 'tiktok', label: 'TikTok' },
            { value: 'youtube', label: 'YouTube' },
          ]}
        />
      </div>

      {campaigns.length > 0 && (
        <div className="w-full sm:w-44">
          <Select
            value={filters.campaignId}
            onChange={(e) => update('campaignId', e.target.value)}
            options={[
              { value: 'all', label: 'All campaigns' },
              ...campaigns.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
      )}

      <div className="w-full sm:w-40">
        <Select
          value={filters.downloadStatus}
          onChange={(e) =>
            update(
              'downloadStatus',
              e.target.value as PostFilters['downloadStatus']
            )
          }
          options={[
            { value: 'all', label: 'All downloads' },
            { value: 'pending', label: 'Pending' },
            { value: 'downloaded', label: 'Downloaded' },
            { value: 'blocked', label: 'Blocked' },
            { value: 'failed', label: 'Failed' },
          ]}
        />
      </div>

    </div>
  )
}
