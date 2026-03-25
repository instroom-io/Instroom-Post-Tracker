export default function Loading() {
  return (
    <div>
      <div className="flex h-14 items-center justify-between border-b border-border bg-background-surface px-5">
        <div className="h-5 w-24 animate-pulse rounded-md bg-background-muted" />
        <div className="h-8 w-32 animate-pulse rounded-lg bg-background-muted" />
      </div>

      <div className="p-5">
        <div className="rounded-xl border border-border bg-background-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="h-4 w-24 animate-pulse rounded bg-background-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-background-muted" />
          </div>
          <div className="border-b border-border px-5 py-2.5 flex gap-8">
            {[120, 80, 100, 60, 60].map((w, i) => (
              <div key={i} className="h-2.5 animate-pulse rounded bg-background-muted" style={{ width: w }} />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-8 border-b border-border/50 px-5 py-3.5 last:border-0">
              <div className="h-3.5 w-40 animate-pulse rounded bg-background-muted" />
              <div className="h-5 w-14 animate-pulse rounded-full bg-background-muted" />
              <div className="ml-auto h-3 w-28 animate-pulse rounded bg-background-muted" />
              <div className="h-3 w-16 animate-pulse rounded bg-background-muted" />
              <div className="h-3 w-10 animate-pulse rounded bg-background-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
