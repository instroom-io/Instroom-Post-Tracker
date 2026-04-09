import { InfluencerListSkeleton } from '@/components/influencers/influencer-list-skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* PageHeader skeleton */}
      <div className="flex min-h-14 items-center justify-between border-b border-border bg-background-surface px-5 py-3">
        <div className="space-y-1.5">
          <div className="h-4 w-24 animate-pulse rounded bg-background-muted" />
          <div className="h-2.5 w-40 animate-pulse rounded bg-background-muted" />
        </div>
        <div className="h-8 w-32 animate-pulse rounded-lg bg-background-muted" />
      </div>

      {/* Table skeleton */}
      <InfluencerListSkeleton />
    </div>
  )
}
