'use client'

import { useTransition, useState } from 'react'
import { acceptBrandOnboarding } from '@/lib/actions/brands'

interface ConfirmButtonProps {
  token: string
}

export function ConfirmButton({ token }: ConfirmButtonProps) {
  const [isPending, startTransition] = useTransition()
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleConfirm() {
    setError(null)
    startTransition(async () => {
      const result = await acceptBrandOnboarding(token)
      if (result?.error) {
        setError(result.error)
        return
      }
      setConfirmed(true)
    })
  }

  if (confirmed) {
    return (
      <div className="rounded-lg bg-background-subtle px-4 py-3 text-center">
        <p className="text-[13px] font-medium text-foreground">
          ✓ Confirmed! Your onboarding is complete.
        </p>
        <p className="mt-1 text-[12px] text-foreground-lighter">
          Your agency will be in touch with next steps.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-[12px] text-destructive text-center">{error}</p>
      )}
      <button
        onClick={handleConfirm}
        disabled={isPending}
        className="w-full rounded-lg bg-foreground px-4 py-2.5 text-[13px] font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Confirming…' : 'Confirm my onboarding'}
      </button>
    </div>
  )
}
