export default function Loading() {
  return (
    <div>
      <div className="flex h-14 items-center border-b border-border bg-background-surface px-5">
        <div className="h-5 w-20 animate-pulse rounded-md bg-background-muted" />
      </div>

      <div className="space-y-5 p-5">
        {/* Workspace settings card */}
        <div className="rounded-xl border border-border bg-background-surface shadow-sm">
          <div className="border-b border-border px-5 py-3.5">
            <div className="h-4 w-36 animate-pulse rounded bg-background-muted" />
          </div>
          <div className="space-y-4 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-24 animate-pulse rounded bg-background-muted" />
                <div className="h-9 w-full animate-pulse rounded-lg bg-background-muted" />
              </div>
            ))}
            <div className="pt-2">
              <div className="h-9 w-24 animate-pulse rounded-lg bg-background-muted" />
            </div>
          </div>
        </div>

        {/* Members card */}
        <div className="rounded-xl border border-border bg-background-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="h-4 w-20 animate-pulse rounded bg-background-muted" />
            <div className="h-8 w-28 animate-pulse rounded-lg bg-background-muted" />
          </div>
          <div className="border-b border-border px-5 py-2.5 flex gap-8">
            {[160, 100, 80, 60].map((w, i) => (
              <div key={i} className="h-2.5 animate-pulse rounded bg-background-muted" style={{ width: w }} />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border/50 px-5 py-3 last:border-0">
              <div className="h-8 w-8 animate-pulse rounded-full bg-background-muted shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="h-3 w-32 animate-pulse rounded bg-background-muted" />
                <div className="h-2.5 w-40 animate-pulse rounded bg-background-muted" />
              </div>
              <div className="h-5 w-16 animate-pulse rounded-full bg-background-muted ml-auto" />
              <div className="h-3 w-8 animate-pulse rounded bg-background-muted" />
            </div>
          ))}
        </div>

        {/* EMV settings card */}
        <div className="rounded-xl border border-border bg-background-surface shadow-sm">
          <div className="border-b border-border px-5 py-3.5">
            <div className="h-4 w-32 animate-pulse rounded bg-background-muted" />
          </div>
          <div className="space-y-3 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-3 w-20 animate-pulse rounded bg-background-muted" />
                <div className="h-9 w-28 animate-pulse rounded-lg bg-background-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
