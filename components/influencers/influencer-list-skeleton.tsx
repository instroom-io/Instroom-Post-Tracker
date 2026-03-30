export function InfluencerListSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Filter bar */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-8 w-56 rounded-lg bg-background-muted" />
        <div className="h-8 w-44 rounded-lg bg-background-muted" />
        <div className="ml-auto h-8 w-32 rounded-lg bg-background-muted" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-background-surface">
        {/* Header */}
        <div className="flex items-center gap-8 border-b border-border px-5 py-2.5">
          <div className="h-2.5 w-24 rounded bg-background-muted" />
          <div className="h-2.5 w-16 rounded bg-background-muted" />
          <div className="h-2.5 w-20 rounded bg-background-muted" />
        </div>

        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border/50 px-5 py-3 last:border-0">
            {/* Avatar + name */}
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-background-muted" />
              <div className="h-3 w-28 rounded bg-background-muted" />
            </div>
            {/* Platforms */}
            <div className="ml-8 flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-background-muted" />
              <div className="h-6 w-6 rounded bg-background-muted" />
            </div>
            {/* Campaign badge */}
            <div className="ml-auto h-5 w-10 rounded-full bg-background-muted" />
            {/* Kebab */}
            <div className="h-5 w-5 rounded bg-background-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
