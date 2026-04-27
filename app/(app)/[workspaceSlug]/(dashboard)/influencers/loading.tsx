import { InfluencerListSkeleton } from '@/components/influencers/influencer-list-skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      {/* PageHeader skeleton */}
      <div className="flex min-h-14 items-center justify-between border-b border-border bg-background-surface px-5 py-3">
        <div className="space-y-1.5">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-2.5 w-40" />
        </div>
        <div className="skeleton h-8 w-32 rounded-lg" />
      </div>

      {/* Table skeleton */}
      <InfluencerListSkeleton />
    </div>
  )
}
