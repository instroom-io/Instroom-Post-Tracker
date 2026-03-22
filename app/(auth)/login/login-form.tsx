'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { signIn } from '@/lib/actions/auth'

const initialState = undefined

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, isPending] = useActionState(signIn, initialState)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={action} className="flex flex-col gap-4">
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
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
          placeholder="you@agency.com"
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
            autoComplete="current-password"
            required
            placeholder="••••••••"
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

      {state?.error && (
        <p className="text-[11px] text-destructive">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="h-10 w-full rounded-lg bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="text-center text-[12px] text-foreground-lighter">
        Don't have an account?{' '}
        <Link
          href="/signup"
          className="text-brand hover:underline"
        >
          Sign up
        </Link>
      </p>
    </form>
  )
}
