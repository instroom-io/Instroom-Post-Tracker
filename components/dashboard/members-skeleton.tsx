export function MembersSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-background-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="h-4 w-20 animate-pulse rounded bg-background-muted" />
        <div className="h-8 w-28 animate-pulse rounded-lg bg-background-muted" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border/50 px-5 py-3 last:border-0">
          <div className="h-8 w-8 animate-pulse rounded-full bg-background-muted shrink-0" />
          <div className="flex flex-col gap-1.5 flex-1">
            <div className="h-3 w-32 animate-pulse rounded bg-background-muted" />
            <div className="h-2.5 w-40 animate-pulse rounded bg-background-muted" />
          </div>
          <div className="h-5 w-16 animate-pulse rounded-full bg-background-muted ml-auto" />
        </div>
      ))}
    </div>
  )
}
