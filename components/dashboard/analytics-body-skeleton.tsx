export function AnalyticsBodySkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <div className="h-9 w-36 animate-pulse rounded-lg bg-background-muted" />
        <div className="h-9 w-44 animate-pulse rounded-lg bg-background-muted" />
        <div className="h-9 w-36 animate-pulse rounded-lg bg-background-muted" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-background-muted" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-background-surface p-4">
            <div className="h-3 w-16 animate-pulse rounded bg-background-muted" />
            <div className="mt-2 h-7 w-20 animate-pulse rounded bg-background-muted" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-background-surface p-5">
            <div className="mb-4 h-4 w-28 animate-pulse rounded bg-background-muted" />
            <div className="h-48 animate-pulse rounded-lg bg-background-muted" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-background-surface">
        <div className="border-b border-border px-5 py-3.5">
          <div className="h-4 w-40 animate-pulse rounded bg-background-muted" />
        </div>
        <div className="divide-y divide-border/50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <div className="h-3 w-4 animate-pulse rounded bg-background-muted" />
              <div className="h-3 w-28 animate-pulse rounded bg-background-muted" />
              <div className="ml-auto flex gap-4">
                <div className="h-3 w-14 animate-pulse rounded bg-background-muted" />
                <div className="h-3 w-14 animate-pulse rounded bg-background-muted" />
                <div className="h-3 w-14 animate-pulse rounded bg-background-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
