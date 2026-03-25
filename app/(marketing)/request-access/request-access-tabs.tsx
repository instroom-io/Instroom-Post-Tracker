'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { submitAgencyRequest } from '@/lib/actions/agencies'
import { Button } from '@/components/ui/button'

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-background-surface px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors'

const labelClass = 'text-[12px] font-medium text-foreground-light'

function SuccessState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
        <CheckCircle2 size={24} className="text-success" />
      </div>
      <div>
        <h2 className="font-display text-[18px] font-bold text-foreground">{title}</h2>
        <p className="mt-1.5 text-[13px] text-foreground-lighter">{body}</p>
      </div>
    </div>
  )
}

export function RequestAccessTabs() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      agency_name: formData.get('agency_name') as string,
      website_url: formData.get('website_url') as string,
      contact_name: formData.get('contact_name') as string,
      contact_email: formData.get('contact_email') as string,
      description: formData.get('description') as string,
    }

    startTransition(async () => {
      const result = await submitAgencyRequest(data)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSubmitted(true)
    })
  }

  if (submitted) {
    return (
      <SuccessState
        title="Application Received"
        body="We'll review your agency application and reach out within 2–3 business days."
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="agency_name" className={labelClass}>Agency name</label>
        <input id="agency_name" name="agency_name" type="text" required placeholder="Acme Agency" className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="website_url" className={labelClass}>Website URL</label>
        <input id="website_url" name="website_url" type="url" required placeholder="https://acmeagency.com" className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact_name" className={labelClass}>Contact name</label>
        <input id="contact_name" name="contact_name" type="text" required placeholder="Jane Smith" className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact_email" className={labelClass}>Contact email</label>
        <input id="contact_email" name="contact_email" type="email" required placeholder="jane@acmeagency.com" className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className={labelClass}>
          Tell us about your agency <span className="text-foreground-muted">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={500}
          placeholder="What kind of campaigns do you run, how many brands do you manage..."
          className="w-full rounded-lg border border-border bg-background-surface px-3 py-2.5 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors resize-none"
        />
      </div>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      <Button type="submit" variant="primary" size="lg" loading={isPending} className="w-full">
        {isPending ? 'Submitting…' : 'Apply as Agency'}
      </Button>
    </form>
  )
}
