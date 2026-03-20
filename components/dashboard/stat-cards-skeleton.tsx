export function StatCardsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading statistics" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-background-surface p-4 shadow-md"
        >
          <div className="skeleton mb-3 h-3 w-20" />
          <div className="skeleton mb-2 h-7 w-16" />
          <div className="skeleton h-2.5 w-24" />
        </div>
      ))}
    </div>
  )
}
