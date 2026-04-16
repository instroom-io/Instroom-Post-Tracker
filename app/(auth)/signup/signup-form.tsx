'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { Eye, EyeSlash } from '@phosphor-icons/react'
import { signUp } from '@/lib/actions/auth'
import { signInWithGoogle } from '@/lib/supabase/client'

const initialState = undefined

export function SignupForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, isPending] = useActionState(signUp, initialState)
  const [showPassword, setShowPassword] = useState(false)
  const [accountType, setAccountType] = useState<'team' | 'solo'>('solo')
  const [accountName, setAccountName] = useState('')
  const [googleError, setGoogleError] = useState<string | null>(null)
  const isInviteSignup = redirectTo?.startsWith('/invite/')

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
      <input type="hidden" name="account_type" value={accountType} />

      {isInviteSignup ? (
        <>
          {/* Invite path: pass placeholder values to satisfy schema — workspace creation is skipped in handlePostAuth */}
          <input type="hidden" name="account_name" value="member" />
          <p className="text-[12px] text-foreground-lighter text-center">
            Create an account to accept the invitation.
          </p>
        </>
      ) : (
        <>
          <div className="flex rounded-lg border border-border bg-background-muted p-0.5">
            <button
              type="button"
              onClick={() => setAccountType('solo')}
              className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                accountType === 'solo'
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Solo
            </button>
            <button
              type="button"
              onClick={() => setAccountType('team')}
              className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                accountType === 'team'
                  ? 'bg-brand text-white shadow-sm'
                  : 'text-foreground-muted hover:text-foreground'
              }`}
            >
              Team
            </button>
          </div>

          {/* Account name */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="account_name"
              className="text-[12px] font-medium text-foreground-light"
            >
              {accountType === 'team' ? 'Agency / team name' : 'Workspace name'}
            </label>
            <input
              id="account_name"
              name="account_name"
              type="text"
              autoComplete="organization"
              required
              minLength={2}
              maxLength={60}
              placeholder={accountType === 'team' ? 'e.g. Armful Media' : 'e.g. NovaSkin Beauty'}
              value={accountName}
              onChange={(e) => { setAccountName(e.target.value); setGoogleError(null) }}
              className="h-10 w-full rounded-lg border border-border bg-background-surface px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
            />
          </div>

          {/* Website URL — all account types, used for favicon logo */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="website_url"
              className="text-[12px] font-medium text-foreground-light"
            >
              Website{' '}
              <span className="text-foreground-muted font-normal">(optional)</span>
            </label>
            <input
              id="website_url"
              name="website_url"
              type="url"
              autoComplete="url"
              placeholder={accountType === 'team' ? 'https://yourteam.com' : 'https://yourbrand.com'}
              className="h-10 w-full rounded-lg border border-border bg-background-surface px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
            />
            <p className="text-[11px] text-foreground-muted">Used to show your logo automatically.</p>
          </div>
        </>
      )}

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
          placeholder="you@example.com"
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
            {showPassword ? <EyeSlash size={15} /> : <Eye size={15} />}
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

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-2 text-[11px] text-foreground-muted">or</span>
        </div>
      </div>

      {googleError && (
        <p className="text-center text-[11px] text-destructive">{googleError}</p>
      )}

      <button
        type="button"
        onClick={() => {
          if (!isInviteSignup) {
            if (!accountName.trim() || accountName.trim().length < 2) {
              setGoogleError(`Enter a ${accountType === 'team' ? 'team' : 'workspace'} name above first.`)
              return
            }
          }
          setGoogleError(null)
          signInWithGoogle(redirectTo, isInviteSignup ? undefined : accountType, isInviteSignup ? undefined : accountName.trim())
        }}
        className="flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-background-surface text-[13px] font-medium text-foreground hover:bg-background-muted transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
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
