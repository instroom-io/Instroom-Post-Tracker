export default function Loading() {
  return (
    <div className="space-y-5 p-5">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-background-muted" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-background-muted" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-background-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-background-muted" />
    </div>
  )
}
