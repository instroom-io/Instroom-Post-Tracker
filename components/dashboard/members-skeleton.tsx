export function MembersSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-background-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <div className="skeleton h-4 w-20" />
        <div className="skeleton h-8 w-28 rounded-lg" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border/50 px-5 py-3 last:border-0">
          <div className="skeleton h-8 w-8 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="skeleton h-3 w-32" />
            <div className="skeleton h-2.5 w-40" />
          </div>
          <div className="skeleton ml-auto h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}
