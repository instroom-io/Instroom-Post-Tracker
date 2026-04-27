export function InfluencerListSkeleton() {
  return (
    <div>
      {/* Filter bar */}
      <div className="mb-6 flex items-center gap-3">
        <div className="skeleton h-8 w-56 rounded-lg" />
        <div className="skeleton h-8 w-44 rounded-lg" />
        <div className="skeleton ml-auto h-8 w-32 rounded-lg" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-background-surface">
        {/* Header */}
        <div className="flex items-center gap-8 border-b border-border px-5 py-2.5">
          <div className="skeleton h-2.5 w-24" />
          <div className="skeleton h-2.5 w-16" />
          <div className="skeleton h-2.5 w-20" />
        </div>

        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border/50 px-5 py-3 last:border-0">
            {/* Avatar + name */}
            <div className="flex items-center gap-3">
              <div className="skeleton h-8 w-8 rounded-full" />
              <div className="skeleton h-3 w-28" />
            </div>
            {/* Platforms */}
            <div className="ml-8 flex items-center gap-2">
              <div className="skeleton h-6 w-6" />
              <div className="skeleton h-6 w-6" />
            </div>
            {/* Campaign badge */}
            <div className="skeleton ml-auto h-5 w-10 rounded-full" />
            {/* Kebab */}
            <div className="skeleton h-5 w-5" />
          </div>
        ))}
      </div>
    </div>
  )
}
