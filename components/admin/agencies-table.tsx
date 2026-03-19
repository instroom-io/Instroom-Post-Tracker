import { Badge } from '@/components/ui/badge'
import type { Agency } from '@/lib/types'

interface Props {
  agencies: Agency[]
}

export function AgenciesTable({ agencies }: Props) {
  if (agencies.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No agencies yet. Approve a request to add one.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {agencies.map((agency) => (
        <a
          key={agency.id}
          href={`/admin/agencies/${agency.id}`}
          className="flex items-center justify-between rounded-lg border border-border bg-background-surface px-4 py-3 hover:border-foreground/20 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">{agency.name}</p>
            <p className="text-[11px] text-muted-foreground">{agency.slug}</p>
          </div>
          <Badge
            variant={
              agency.status === 'active'
                ? 'success'
                : agency.status === 'suspended'
                ? 'destructive'
                : 'muted'
            }
          >
            {agency.status}
          </Badge>
        </a>
      ))}
    </div>
  )
}
