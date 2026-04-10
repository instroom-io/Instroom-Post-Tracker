'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { Agency } from '@/lib/types'

interface Props {
  agencies: Agency[]
}

function LogoAvatar({ logoUrl, agencyName }: { logoUrl: string | null; agencyName: string }) {
  const [showFallback, setShowFallback] = useState(false)

  const initial = (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-background text-[15px] font-bold">
      {agencyName.charAt(0).toUpperCase()}
    </div>
  )

  if (!logoUrl || showFallback) return initial

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt=""
      width={36}
      height={36}
      className="h-9 w-9 shrink-0 rounded-lg border border-border bg-background-subtle object-contain p-1"
      onError={() => setShowFallback(true)}
    />
  )
}

export function AgenciesTable({ agencies }: Props) {
  if (agencies.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-foreground-lighter">
        No agencies yet. Approve a request to add one.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {agencies.map((agency) => (
        <a
          key={agency.id}
          href={`/admin/agencies/${agency.slug}`}
          className="flex items-center justify-between rounded-lg border border-border bg-background-surface px-4 py-3 hover:border-foreground/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <LogoAvatar logoUrl={agency.logo_url} agencyName={agency.name} />
            <div>
              <p className="text-[13px] font-semibold text-foreground">{agency.name}</p>
              <p className="text-[11px] text-foreground-lighter">{agency.slug}</p>
              <p className="text-[11px] text-foreground-muted">
                {new Date(agency.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
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
