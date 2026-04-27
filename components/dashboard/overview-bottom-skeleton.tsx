export function OverviewBottomSkeleton() {
  return (
    <>
      {/* Campaigns table skeleton */}
      <div className="rounded-xl border border-border bg-background-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="h-4 w-24 skeleton" />
          <div className="h-3 w-12 skeleton" />
        </div>
        <div className="divide-y divide-border/50">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5">
              <div className="h-3 w-32 skeleton" />
              <div className="skeleton ml-auto h-5 w-14 rounded-full" />
              <div className="h-3 w-20 skeleton" />
              <div className="h-3 w-12 skeleton" />
            </div>
          ))}
        </div>
      </div>

      {/* Recent posts grid skeleton */}
      <div className="rounded-xl border border-border bg-background-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="h-4 w-28 skeleton" />
          <div className="h-3 w-12 skeleton" />
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton aspect-square rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
