'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { acceptBrandInvite } from '@/lib/actions/brand-requests'

interface Props {
  token: string
}

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors'

const labelClass = 'text-[12px] font-medium text-foreground-light'

export function AcceptInviteForm({ token }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      contact_name: formData.get('contact_name') as string,
      website_url: formData.get('website_url') as string,
      logo_url: formData.get('logo_url') as string,
    }

    startTransition(async () => {
      const result = await acceptBrandInvite(token, data)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 size={24} className="text-success" />
        </div>
        <div>
          <p className="font-display text-[15px] font-bold text-foreground">Details received!</p>
          <p className="mt-1.5 text-[13px] text-foreground-lighter leading-relaxed">
            Check your email — we've sent you a link to access your brand portal.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact_name" className={labelClass}>
          Your name
        </label>
        <input
          id="contact_name"
          name="contact_name"
          type="text"
          required
          placeholder="Jane Smith"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="website_url" className={labelClass}>
          Brand website
        </label>
        <input
          id="website_url"
          name="website_url"
          type="url"
          required
          placeholder="https://yourbrand.com"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="logo_url" className={labelClass}>
          Brand logo URL <span className="text-foreground-muted">(optional)</span>
        </label>
        <input
          id="logo_url"
          name="logo_url"
          type="url"
          placeholder="https://cdn.yourbrand.com/logo.png"
          className={inputClass}
        />
      </div>

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="h-10 w-full rounded-lg bg-brand px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Submitting…' : 'Confirm details'}
      </button>
    </form>
  )
}
