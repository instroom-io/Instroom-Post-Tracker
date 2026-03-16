export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-background-surface p-4"
        >
          <div className="mb-3 h-3 w-20 animate-pulse rounded-md bg-background-muted" />
          <div className="mb-1 h-7 w-16 animate-pulse rounded-md bg-background-muted" />
          <div className="h-2.5 w-24 animate-pulse rounded-md bg-background-muted" />
        </div>
      ))}
    </div>
  )
}
