'use client'

import { useState, useTransition, useRef } from 'react'
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
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        logoFile,
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

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-foreground">Brand logo (optional)</label>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif"
            className="hidden"
            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose file
          </Button>
          {logoFile ? (
            <span className="max-w-[160px] truncate text-[12px] text-foreground-lighter">{logoFile.name}</span>
          ) : (
            <span className="text-[12px] text-foreground-muted">No file chosen</span>
          )}
        </div>
        <p className="text-[11px] text-foreground-muted">JPEG, PNG or GIF, max 2 MB</p>
      </div>

      {error && (
        <p className="text-[11px] text-destructive">{error}</p>
      )}
      <Button type="submit" variant="primary" size="md" loading={isPending} className="w-full">
        Submit
      </Button>
    </form>
  )
}
