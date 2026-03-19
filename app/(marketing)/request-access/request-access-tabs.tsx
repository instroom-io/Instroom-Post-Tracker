'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { submitBrandRequest } from '@/lib/actions/brand-requests'
import { submitAgencyRequest } from '@/lib/actions/agencies'
import type { Agency } from '@/lib/types'

type Tab = 'brand' | 'agency'

interface Props {
  agencies: Pick<Agency, 'id' | 'name'>[]
}

const inputClass =
  'h-10 w-full rounded-lg border border-border bg-background-surface px-3 text-[13px] text-foreground placeholder:text-foreground-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors'

const labelClass = 'text-[12px] font-medium text-foreground-light'

const submitBtnClass =
  'h-10 w-full rounded-lg bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60'

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

function BrandForm({ agencies }: { agencies: Pick<Agency, 'id' | 'name'>[] }) {
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
      logo_url: formData.get('logo_url') as string,
      contact_name: formData.get('contact_name') as string,
      contact_email: formData.get('contact_email') as string,
      description: formData.get('description') as string,
      agency_id: (formData.get('agency_id') as string) || undefined,
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
      <SuccessState
        title="Request Received"
        body="Your request has been received. We'll be in touch soon."
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {agencies.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="agency_id" className={labelClass}>
            Agency <span className="text-foreground-muted">(optional)</span>
          </label>
          <select
            id="agency_id"
            name="agency_id"
            className="h-10 w-full rounded-lg border border-border bg-background-surface px-3 text-[13px] text-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors"
          >
            <option value="">Select your agency (if applicable)</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="brand_name" className={labelClass}>
          Brand name
        </label>
        <input
          id="brand_name"
          name="brand_name"
          type="text"
          required
          placeholder="Acme Co."
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="website_url" className={labelClass}>
          Website URL
        </label>
        <input
          id="website_url"
          name="website_url"
          type="url"
          required
          placeholder="https://acme.com"
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
          placeholder="https://cdn.acme.com/logo.png"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact_name" className={labelClass}>
          Contact name
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
        <label htmlFor="contact_email" className={labelClass}>
          Contact email
        </label>
        <input
          id="contact_email"
          name="contact_email"
          type="email"
          required
          placeholder="jane@acme.com"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className={labelClass}>
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

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      <button type="submit" disabled={isPending} className={submitBtnClass}>
        {isPending ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  )
}

function AgencyForm() {
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
        <label htmlFor="agency_name" className={labelClass}>
          Agency name
        </label>
        <input
          id="agency_name"
          name="agency_name"
          type="text"
          required
          placeholder="Acme Agency"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="website_url" className={labelClass}>
          Website URL
        </label>
        <input
          id="website_url"
          name="website_url"
          type="url"
          required
          placeholder="https://acmeagency.com"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact_name" className={labelClass}>
          Contact name
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
        <label htmlFor="contact_email" className={labelClass}>
          Contact email
        </label>
        <input
          id="contact_email"
          name="contact_email"
          type="email"
          required
          placeholder="jane@acmeagency.com"
          className={inputClass}
        />
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

      <button type="submit" disabled={isPending} className={submitBtnClass}>
        {isPending ? 'Submitting...' : 'Apply as Agency'}
      </button>
    </form>
  )
}

export function RequestAccessTabs({ agencies }: Props) {
  const [tab, setTab] = useState<Tab>('brand')

  return (
    <div className="flex flex-col gap-6">
      {/* Toggle */}
      <div className="flex rounded-lg border border-border bg-background p-1 gap-1">
        <button
          type="button"
          onClick={() => setTab('brand')}
          className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
            tab === 'brand'
              ? 'bg-background-surface text-foreground shadow-sm'
              : 'text-foreground-lighter hover:text-foreground'
          }`}
        >
          I&apos;m a Brand
        </button>
        <button
          type="button"
          onClick={() => setTab('agency')}
          className={`flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
            tab === 'agency'
              ? 'bg-background-surface text-foreground shadow-sm'
              : 'text-foreground-lighter hover:text-foreground'
          }`}
        >
          I&apos;m an Agency
        </button>
      </div>

      {/* Form */}
      {tab === 'brand' ? <BrandForm agencies={agencies} /> : <AgencyForm />}
    </div>
  )
}
