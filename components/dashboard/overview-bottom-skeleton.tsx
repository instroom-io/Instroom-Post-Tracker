export function OverviewBottomSkeleton() {
  return (
    <>
      {/* Campaigns table skeleton */}
      <div className="rounded-xl border border-border bg-background-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="h-4 w-24 animate-pulse rounded bg-background-muted" />
          <div className="h-3 w-12 animate-pulse rounded bg-background-muted" />
        </div>
        <div className="divide-y divide-border/50">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className="h-3 w-32 animate-pulse rounded bg-background-muted" />
              <div className="ml-auto h-5 w-14 animate-pulse rounded-full bg-background-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-background-muted" />
              <div className="h-3 w-12 animate-pulse rounded bg-background-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent posts grid skeleton */}
      <div className="rounded-xl border border-border bg-background-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="h-4 w-28 animate-pulse rounded bg-background-muted" />
          <div className="h-3 w-12 animate-pulse rounded bg-background-muted" />
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl bg-background-muted" />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
