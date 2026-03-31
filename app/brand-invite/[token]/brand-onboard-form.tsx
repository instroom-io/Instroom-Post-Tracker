'use client'

import { useState, useTransition } from 'react'
import { CheckCircle } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { acceptBrandInvite } from '@/lib/actions/agencies'

interface BrandOnboardFormProps {
  token: string
}

export function BrandOnboardForm({ token }: BrandOnboardFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <CheckCircle className="h-10 w-10 text-brand" />
        <h2 className="text-[16px] font-semibold text-foreground">All set!</h2>
        <p className="text-[13px] text-foreground-lighter">
          Your brand profile has been submitted. The agency will be in touch.
        </p>
      </div>
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await acceptBrandInvite(token, {
        logoUrl: logoUrl.trim() || undefined,
        websiteUrl: websiteUrl.trim(),
      })
      if (result?.error) {
        setError(result.error)
        return
      }
      setDone(true)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Website URL"
        type="text"
        value={websiteUrl}
        onChange={(e) => setWebsiteUrl(e.target.value)}
        placeholder="www.yourbrand.com"
        required
        error={undefined}
      />
      <Input
        label="Brand logo URL (optional)"
        type="text"
        value={logoUrl}
        onChange={(e) => setLogoUrl(e.target.value)}
        placeholder="https://yourbrand.com/logo.png"
        error={undefined}
      />
      {error && (
        <p className="text-[11px] text-destructive">{error}</p>
      )}
      <Button type="submit" variant="primary" size="md" loading={isPending} className="w-full">
        Submit
      </Button>
    </form>
  )
}
