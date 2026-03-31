'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { updatePassword } from '@/lib/actions/auth'

const initialState = undefined

export function ResetPasswordForm() {
  const [state, action, isPending] = useActionState(updatePassword, initialState)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const errorMessage = state && typeof state === 'object' && 'error' in state ? state.error : null

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-[12px] font-medium text-foreground-light"
        >
          New password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            placeholder="At least 8 characters"
            className="h-10 w-full rounded-lg border border-border bg-background-surface px-3 pr-10 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="confirmPassword"
          className="text-[12px] font-medium text-foreground-light"
        >
          Confirm new password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            required
            placeholder="Re-enter your password"
            className="h-10 w-full rounded-lg border border-border bg-background-surface px-3 pr-10 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
          >
            {showConfirm ? <EyeSlash size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {errorMessage && (
        <p className="text-[11px] text-destructive">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="h-10 w-full rounded-lg bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Updating…' : 'Update password'}
      </button>
    </form>
  )
}
