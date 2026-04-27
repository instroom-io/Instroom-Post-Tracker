'use client'

import { useState, useTransition } from 'react'
import { requestWorkspaceAccess } from '@/lib/actions/workspace'
import { CheckCircle } from '@phosphor-icons/react'

interface JoinRequestFormProps {
  workspaceId: string
  workspaceName: string
}

export function JoinRequestForm({ workspaceId, workspaceName }: JoinRequestFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 text-center py-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10">
          <CheckCircle size={24} weight="fill" className="text-brand" />
        </div>
        <p className="text-[13px] font-semibold text-foreground">Request sent</p>
        <p className="text-[12px] text-foreground-lighter">
          The <strong className="text-foreground">{workspaceName}</strong> Admin will review your
          request and you&apos;ll be notified by email.
        </p>
      </div>
    )
  }

  function handleSubmit() {
    setError(null)
    startTransition(async () => {
      const result = await requestWorkspaceAccess(workspaceId)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSubmitted(true)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border bg-background-muted/40 px-4 py-3">
        <p className="text-[11px] font-semibold text-foreground-lighter mb-0.5">
          Workspace
        </p>
        <p className="text-[13px] font-medium text-foreground">{workspaceName}</p>
      </div>

      {error && (
        <p className="text-[11px] text-destructive">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="flex h-10 w-full items-center justify-center rounded-lg bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:opacity-60"
      >
        {isPending ? 'Sending request…' : 'Request access'}
      </button>
    </div>
  )
}
