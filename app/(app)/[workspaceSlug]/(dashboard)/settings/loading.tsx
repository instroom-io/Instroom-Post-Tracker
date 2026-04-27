import { EmvSectionSkeleton } from '@/components/dashboard/emv-section-skeleton'

export default function Loading() {
  return (
    <div>
      <div className="flex h-14 items-center border-b border-border bg-background-surface px-5">
        <div className="skeleton h-5 w-20" />
      </div>

      <div className="space-y-5 p-5">
        {/* Workspace settings card */}
        <div className="rounded-xl border border-border bg-background-surface shadow-sm">
          <div className="border-b border-border px-5 py-3.5">
            <div className="skeleton h-4 w-36" />
          </div>
          <div className="space-y-4 p-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="skeleton h-3 w-24" />
                <div className="skeleton h-9 w-full rounded-lg" />
              </div>
            ))}
            <div className="pt-2">
              <div className="skeleton h-9 w-24 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Members card */}
        <div className="rounded-xl border border-border bg-background-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="skeleton h-4 w-20" />
            <div className="skeleton h-8 w-28 rounded-lg" />
          </div>
          <div className="border-b border-border px-5 py-2.5 flex gap-8">
            {[160, 100, 80, 60].map((w, i) => (
              <div key={i} className="skeleton h-2.5" style={{ width: w }} />
            ))}
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border/50 px-5 py-3 last:border-0">
              <div className="skeleton h-8 w-8 rounded-full shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="skeleton h-3 w-32" />
                <div className="skeleton h-2.5 w-40" />
              </div>
              <div className="skeleton h-5 w-16 rounded-full ml-auto" />
              <div className="skeleton h-3 w-8" />
            </div>
          ))}
        </div>

        {/* EMV settings card */}
        <EmvSectionSkeleton />
      </div>
    </div>
  )
}
