export function BrandRequestsTableSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-background-surface shadow-sm">
      {/* Tab skeleton */}
      <div className="flex gap-4 border-b border-border px-5 py-2.5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 w-16 skeleton" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="p-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-6 border-b border-border/30 py-4 last:border-0">
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-32 skeleton" />
              <div className="h-3 w-48 skeleton" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-28 skeleton" />
              <div className="h-3 w-40 skeleton" />
            </div>
            <div className="h-3 w-24 skeleton" />
            <div className="h-3 w-20 skeleton" />
            <div className="flex gap-2">
              <div className="h-7 w-20 skeleton" />
              <div className="h-7 w-16 skeleton" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
