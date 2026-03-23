'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { approveAgencyRequest, rejectAgencyRequest } from '@/lib/actions/agencies'
import { Button } from '@/components/ui/button'
import type { AgencyRequest } from '@/lib/types'

interface Props {
  requests: AgencyRequest[]
}

export function AgencyRequestsTable({ requests }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (requests.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-foreground-lighter">
        No pending agency requests.
      </p>
    )
  }

  function handleApprove(req: AgencyRequest) {
    setError(null)
    startTransition(async () => {
      const result = await approveAgencyRequest(req.id)
      if (result?.error) {
        setError(result.error)
      } else {
        toast.success(`${req.agency_name} approved`)
        router.refresh()
      }
    })
  }

  function handleReject(req: AgencyRequest) {
    setError(null)
    startTransition(async () => {
      const result = await rejectAgencyRequest(req.id)
      if (result?.error) {
        setError(result.error)
      } else {
        toast.success(`${req.agency_name} rejected`)
        router.refresh()
      }
    })
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex items-center justify-between rounded-lg border border-border bg-background-surface px-4 py-3"
        >
          <div>
            <p className="text-[13px] font-semibold text-foreground">{req.agency_name}</p>
            <p className="text-[11px] text-foreground-lighter">
              {req.contact_email} · {new Date(req.created_at).toLocaleDateString()}
            </p>
            {req.description && (
              <p className="mt-1 text-[11px] text-foreground-lighter line-clamp-1">{req.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              loading={isPending}
              onClick={() => handleApprove(req)}
            >
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={isPending}
              onClick={() => handleReject(req)}
            >
              Reject
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
