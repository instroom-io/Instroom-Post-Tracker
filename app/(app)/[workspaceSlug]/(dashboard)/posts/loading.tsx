export default function Loading() {
  return (
    <div>
      <div className="flex h-14 items-center border-b border-border bg-background-surface px-5">
        <div className="flex flex-col gap-1">
          <div className="h-5 w-12 animate-pulse rounded-md bg-background-muted" />
          <div className="h-3 w-40 animate-pulse rounded bg-background-muted" />
        </div>
      </div>

      <div className="space-y-5 p-5">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-3">
          <div className="h-9 w-36 animate-pulse rounded-lg bg-background-muted" />
          <div className="h-9 w-44 animate-pulse rounded-lg bg-background-muted" />
          <div className="h-9 w-40 animate-pulse rounded-lg bg-background-muted" />
          <div className="h-9 w-36 animate-pulse rounded-lg bg-background-muted" />
        </div>

        {/* Posts table */}
        <div className="rounded-xl border border-border bg-background-surface shadow-sm overflow-hidden">
          <div className="border-b border-border px-5 py-2.5 flex gap-6">
            {[40, 100, 80, 80, 60, 60].map((w, i) => (
              <div key={i} className="h-2.5 animate-pulse rounded bg-background-muted" style={{ width: w }} />
            ))}
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border/50 px-5 py-3 last:border-0">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-background-muted shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="h-3 w-48 animate-pulse rounded bg-background-muted" />
                <div className="h-2.5 w-32 animate-pulse rounded bg-background-muted" />
              </div>
              <div className="h-5 w-16 animate-pulse rounded-full bg-background-muted ml-auto" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-background-muted" />
              <div className="h-3 w-16 animate-pulse rounded bg-background-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
