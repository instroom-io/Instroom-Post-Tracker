'use client'

import { useActionState } from 'react'
import { createWorkspace } from '@/lib/actions/workspace'

const initialState = undefined

export function OnboardingForm() {
  const [state, action, isPending] = useActionState(createWorkspace, initialState)

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="name"
          className="text-[12px] font-medium text-foreground-light"
        >
          Brand / workspace name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="Acme Brand"
          autoFocus
          className="h-10 w-full rounded-lg border border-border bg-background-surface px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
        />
        <p className="text-[11px] text-foreground-lighter">
          This is your brand's workspace. You can create more later.
        </p>
      </div>

      {state?.error && (
        <p className="text-[11px] text-destructive">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="h-10 w-full rounded-lg bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Creating workspace…' : 'Create workspace'}
      </button>
    </form>
  )
}
