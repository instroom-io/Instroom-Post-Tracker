export default function Loading() {
  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex h-14 items-center gap-2 border-b border-border bg-background-surface px-5">
        <div className="skeleton h-3.5 w-20" />
        <div className="skeleton h-3 w-3" />
        <div className="skeleton h-3.5 w-32" />
      </div>

      <div className="p-5">
        <div className="rounded-xl border border-border bg-background-surface shadow-sm">
          {/* Tab bar */}
          <div className="flex items-center gap-1 border-b border-border px-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="py-3 pr-3">
                <div className={`skeleton h-3.5 ${i === 0 ? 'w-16' : i === 1 ? 'w-20' : i === 2 ? 'w-12' : 'w-20'}`} />
              </div>
            ))}
          </div>

          <div className="p-5 space-y-5">
            {/* Summary metric cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-background-surface p-4">
                  <div className="skeleton h-3 w-20" />
                  <div className="skeleton mt-2 h-7 w-16" />
                  <div className="skeleton mt-1 h-2.5 w-24" />
                </div>
              ))}
            </div>

            {/* Tracking config card */}
            <div className="rounded-xl border border-border bg-background-surface">
              <div className="border-b border-border px-5 py-3.5">
                <div className="skeleton h-4 w-28" />
              </div>
              <div className="p-5 space-y-3">
                <div className="skeleton h-3 w-full" />
                <div className="skeleton h-3 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
