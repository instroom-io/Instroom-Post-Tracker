'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { saveOnboardingName } from '@/lib/actions/auth'

export function OnboardingNameForm() {
  const searchParams = useSearchParams()
  const typeHint = searchParams.get('type') as 'solo' | 'team' | null
  const [accountType, setAccountType] = useState<'team' | 'solo'>(
    typeHint === 'team' ? 'team' : 'solo'
  )
  const [accountName, setAccountName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await saveOnboardingName(accountType, accountName, websiteUrl || undefined)
      if ('error' in result) {
        setError(result.error)
        return
      }
      router.push(result.redirectTo)
    })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={140} height={32} priority />
        </div>

        <div className="rounded-xl border border-border bg-background-surface p-6 shadow-sm">
          <h1 className="mb-1 text-[16px] font-bold text-foreground">One more thing</h1>
          <p className="mb-6 text-[12px] text-foreground-lighter">
            What should we call your account?
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Account type toggle — only shown if type wasn't pre-selected from signup */}
            {!typeHint && (
              <div className="flex rounded-lg border border-border bg-background-muted p-0.5">
                {(['solo', 'team'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAccountType(type)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      accountType === type
                        ? 'bg-brand text-white shadow-sm'
                        : 'text-foreground-muted hover:text-foreground'
                    }`}
                  >
                    {type === 'team' ? 'Team' : 'Solo'}
                  </button>
                ))}
              </div>
            )}

            {/* Name field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="account_name" className="text-[12px] font-medium text-foreground-light">
                {accountType === 'team' ? 'Agency / team name' : 'Workspace name'}
              </label>
              <input
                id="account_name"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                required
                minLength={2}
                maxLength={60}
                placeholder={accountType === 'team' ? 'e.g. Armful Media' : 'e.g. NovaSkin Beauty'}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
              />
            </div>

            {/* Website URL — team only, used for favicon logo */}
            {accountType === 'team' && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="website_url" className="text-[12px] font-medium text-foreground-light">
                  Website{' '}
                  <span className="text-foreground-muted font-normal">(optional)</span>
                </label>
                <input
                  id="website_url"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  autoComplete="url"
                  placeholder="https://yourteam.com"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
                />
                <p className="text-[11px] text-foreground-muted">Used to show your team logo automatically.</p>
              </div>
            )}

            {error && <p className="text-[11px] text-destructive">{error}</p>}

            <button
              type="submit"
              disabled={isPending || accountName.length < 2}
              className="h-10 w-full rounded-lg bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Setting up your account…' : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
