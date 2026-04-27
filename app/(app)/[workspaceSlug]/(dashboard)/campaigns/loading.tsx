export default function Loading() {
  return (
    <div>
      <div className="flex h-14 items-center justify-between border-b border-border bg-background-surface px-5">
        <div className="skeleton h-5 w-24" />
        <div className="skeleton h-8 w-32 rounded-lg" />
      </div>

      <div className="p-5">
        <div className="rounded-xl border border-border bg-background-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-3 w-16" />
          </div>
          <div className="border-b border-border px-5 py-2.5 flex gap-8">
            {[120, 80, 100, 60, 60].map((w, i) => (
              <div key={i} className="skeleton h-2.5" style={{ width: w }} />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-8 border-b border-border/50 px-5 py-3.5 last:border-0">
              <div className="skeleton h-3.5 w-40" />
              <div className="skeleton h-5 w-14 rounded-full" />
              <div className="skeleton ml-auto h-3 w-28" />
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-3 w-10" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
