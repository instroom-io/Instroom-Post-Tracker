// app/upgrade/page.tsx
'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CheckCircle } from '@phosphor-icons/react'
import { submitUpgradeRequest } from '@/lib/actions/upgrade'

const FEATURES = [
  { label: 'Campaigns + influencer tracking', trial: true, free: true, pro: true },
  { label: 'Post detection', trial: true, free: true, pro: true },
  { label: 'Basic post list + metrics', trial: true, free: true, pro: true },
  { label: 'Drive download', trial: true, free: false, pro: true },
  { label: 'EMV reporting', trial: true, free: false, pro: true },
  { label: 'Advanced analytics', trial: true, free: false, pro: true },
  { label: 'Team member invites', trial: true, free: false, pro: true },
  { label: 'Multiple brand workspaces', trial: true, free: false, pro: true },
]

export default function UpgradePage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [accountName, setAccountName] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await submitUpgradeRequest({ name, email, account_name: accountName, message: message || undefined })
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSuccess(true)
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-6 py-4">
        <Link href="/app">
          <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={130} height={30} priority />
        </Link>
      </div>

      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-[24px] font-bold text-foreground">Upgrade to Pro</h1>
        <p className="mt-2 text-[14px] text-foreground-lighter">
          Get full access to Drive downloads, EMV reporting, advanced analytics, and unlimited team collaboration.
        </p>

        {/* Feature comparison table */}
        <div className="mt-8 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-background-muted">
                <th className="px-4 py-3 text-left font-medium text-foreground">Feature</th>
                <th className="px-4 py-3 text-center font-medium text-foreground">Trial</th>
                <th className="px-4 py-3 text-center font-medium text-foreground">Free</th>
                <th className="px-4 py-3 text-center font-medium text-brand">Pro</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((f, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-foreground-light">{f.label}</td>
                  {(['trial', 'free', 'pro'] as const).map((plan) => (
                    <td key={plan} className="px-4 py-2.5 text-center">
                      {f[plan] ? (
                        <CheckCircle size={16} className="mx-auto text-brand" weight="fill" />
                      ) : (
                        <span className="text-foreground-muted">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Request form */}
        <div className="mt-8 rounded-xl border border-border bg-background-surface p-6">
          <h2 className="mb-4 text-[15px] font-semibold text-foreground">Request upgrade</h2>
          <p className="mb-6 text-[12px] text-foreground-lighter">
            Fill in the form below and we&apos;ll get back to you within 1 business day.
          </p>

          {success ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle size={32} className="text-brand" weight="fill" />
              <p className="text-[14px] font-semibold text-foreground">Request received!</p>
              <p className="text-[12px] text-foreground-lighter">We&apos;ll be in touch soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-foreground-light">Your name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-medium text-foreground-light">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-foreground-light">Agency or workspace name</label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="h-10 rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-foreground-light">Message (optional)</label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                />
              </div>
              {error && <p className="text-[11px] text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={isPending}
                className="h-10 w-full rounded-lg bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:opacity-60"
              >
                {isPending ? 'Sending…' : 'Send request'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
