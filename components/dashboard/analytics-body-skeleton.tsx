export function AnalyticsBodySkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">
        <div className="skeleton h-9 w-36 rounded-lg" />
        <div className="skeleton h-9 w-44 rounded-lg" />
        <div className="skeleton h-9 w-36 rounded-lg" />
        <div className="skeleton h-9 w-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-background-surface p-4">
            <div className="skeleton h-3 w-16" />
            <div className="skeleton mt-2 h-7 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-background-surface p-5">
            <div className="skeleton mb-4 h-4 w-28" />
            <div className="skeleton h-48 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-background-surface">
        <div className="border-b border-border px-5 py-3.5">
          <div className="skeleton h-4 w-40" />
        </div>
        <div className="divide-y divide-border/50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <div className="skeleton h-3 w-4" />
              <div className="skeleton h-3 w-28" />
              <div className="ml-auto flex gap-4">
                <div className="skeleton h-3 w-14" />
                <div className="skeleton h-3 w-14" />
                <div className="skeleton h-3 w-14" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
