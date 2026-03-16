'use client'

import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
      <div className="text-4xl">⚠️</div>
      <p className="font-display text-[15px] font-bold text-foreground">
        Something went wrong
      </p>
      <p className="max-w-xs text-[13px] text-foreground-lighter">
        {error.message ?? 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="h-8 rounded-lg border border-border bg-background-surface px-4 text-[12px] font-medium text-foreground transition-colors hover:bg-background-muted"
      >
        Try again
      </button>
    </div>
  )
}
