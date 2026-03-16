'use client'

import { useState, useTransition } from 'react'
import { submitBrandRequest } from '@/lib/actions/brand-requests'
import { CheckCircle2 } from 'lucide-react'

export function RequestAccessForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      brand_name: formData.get('brand_name') as string,
      website_url: formData.get('website_url') as string,
      contact_name: formData.get('contact_name') as string,
      contact_email: formData.get('contact_email') as string,
      description: formData.get('description') as string,
    }

    startTransition(async () => {
      const result = await submitBrandRequest(data)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 size={24} className="text-success" />
        </div>
        <div>
          <h2 className="font-display text-[18px] font-bold text-foreground">
            Request Received
          </h2>
          <p className="mt-1.5 text-[13px] text-foreground-lighter">
            Your request has been received. We&apos;ll be in touch soon.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="brand_name" className="text-[12px] font-medium text-foreground-light">
          Brand name
        </label>
        <input
          id="brand_name"
          name="brand_name"
          type="text"
          required
          placeholder="Acme Co."
          className="h-10 w-full rounded-lg border border-border bg-background-surface px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="website_url" className="text-[12px] font-medium text-foreground-light">
          Website URL
        </label>
        <input
          id="website_url"
          name="website_url"
          type="url"
          required
          placeholder="https://acme.com"
          className="h-10 w-full rounded-lg border border-border bg-background-surface px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact_name" className="text-[12px] font-medium text-foreground-light">
          Contact name
        </label>
        <input
          id="contact_name"
          name="contact_name"
          type="text"
          required
          placeholder="Jane Smith"
          className="h-10 w-full rounded-lg border border-border bg-background-surface px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact_email" className="text-[12px] font-medium text-foreground-light">
          Contact email
        </label>
        <input
          id="contact_email"
          name="contact_email"
          type="email"
          required
          placeholder="jane@acme.com"
          className="h-10 w-full rounded-lg border border-border bg-background-surface px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-[12px] font-medium text-foreground-light">
          Description <span className="text-foreground-muted">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={500}
          placeholder="Brief description of your campaign needs..."
          className="w-full rounded-lg border border-border bg-background-surface px-3 py-2.5 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors resize-none"
        />
      </div>

      {error && (
        <p className="text-[11px] text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="h-10 w-full rounded-lg bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  )
}
