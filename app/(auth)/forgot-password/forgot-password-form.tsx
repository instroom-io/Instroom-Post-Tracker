'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from '@/lib/actions/auth'

const initialState = undefined

export function ForgotPasswordForm() {
  const [state, action, isPending] = useActionState(requestPasswordReset, initialState)

  if (state && 'success' in state && state.success) {
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-brand"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>
        <div>
          <p className="text-[14px] font-semibold text-foreground">Check your email</p>
          <p className="mt-1 text-[12px] text-foreground-lighter">
            If an account exists for{' '}
            <span className="font-medium text-foreground">{state.email}</span>,
            you&apos;ll receive a reset link shortly.
          </p>
        </div>
        <Link href="/login" className="text-[12px] text-brand hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-[12px] font-medium text-foreground-light"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="instroom@agency.com"
          className="h-10 w-full rounded-lg border border-border bg-background-surface px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/20 transition-colors"
        />
      </div>

      {state && 'error' in state && (
        <p className="text-[11px] text-destructive">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="h-10 w-full rounded-lg bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Sending…' : 'Send reset link'}
      </button>
    </form>
  )
}
