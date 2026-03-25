import { AnalyticsBodySkeleton } from '@/components/dashboard/analytics-body-skeleton'

export default function Loading() {
  return (
    <div>
      {/* Page header */}
      <div className="flex h-14 items-center border-b border-border bg-background-surface px-5">
        <div className="h-5 w-24 animate-pulse rounded-md bg-background-muted" />
      </div>

      <div className="space-y-5 p-5">
        <AnalyticsBodySkeleton />
      </div>
    </div>
  )
}
