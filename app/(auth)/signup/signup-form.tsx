'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { signUp } from '@/lib/actions/auth'

const initialState = undefined

export function SignupForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, isPending] = useActionState(signUp, initialState)
  const [showPassword, setShowPassword] = useState(false)

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
            We sent a confirmation link to{' '}
            <span className="font-medium text-foreground">{state.email}</span>.
            Click it to activate your account.
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
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="full_name"
          className="text-[12px] font-medium text-foreground-light"
        >
          Full name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          placeholder="Jane Smith"
          className="h-10 w-full rounded-lg border border-border bg-background-surface px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-[12px] font-medium text-foreground-light"
        >
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="jane@agency.com"
          className="h-10 w-full rounded-lg border border-border bg-background-surface px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-[12px] font-medium text-foreground-light"
        >
          Password
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
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {state && 'error' in state ? (
        <p className="text-[11px] text-destructive">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="h-10 w-full rounded-lg bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Creating account…' : 'Create account'}
      </button>

      <p className="text-center text-[12px] text-foreground-lighter">
        Already have an account?{' '}
        <Link href="/login" className="text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
