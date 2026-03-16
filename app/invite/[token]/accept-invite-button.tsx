'use client'

import { useTransition, useState } from 'react'
import { acceptInvitation } from '@/lib/actions/workspace'

interface AcceptInviteButtonProps {
  token: string
}

export function AcceptInviteButton({ token }: AcceptInviteButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleAccept() {
    setError(null)
    startTransition(async () => {
      const result = await acceptInvitation(token)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      <button
        onClick={handleAccept}
        disabled={isPending}
        className="h-10 w-full rounded-lg bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Accepting invitation…' : 'Accept invitation'}
      </button>
    </div>
  )
}
