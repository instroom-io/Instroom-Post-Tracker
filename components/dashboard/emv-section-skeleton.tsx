export function EmvSectionSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-background-surface shadow-sm">
      <div className="border-b border-border px-5 py-3.5">
        <div className="skeleton h-4 w-32" />
      </div>
      <div className="space-y-3 p-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="skeleton h-3 w-20" />
            <div className="skeleton h-9 w-28 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
