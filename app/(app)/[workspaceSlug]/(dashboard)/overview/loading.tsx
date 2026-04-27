export default function Loading() {
  return (
    <div className="space-y-5 p-5">
      <div className="skeleton h-8 w-48 rounded-lg" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
      <div className="skeleton h-64 rounded-xl" />
      <div className="skeleton h-40 rounded-xl" />
    </div>
  )
}
