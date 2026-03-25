export function EmvSectionSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-background-surface shadow-sm">
      <div className="border-b border-border px-5 py-3.5">
        <div className="h-4 w-32 animate-pulse rounded bg-background-muted" />
      </div>
      <div className="space-y-3 p-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-3 w-20 animate-pulse rounded bg-background-muted" />
            <div className="h-9 w-28 animate-pulse rounded-lg bg-background-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
