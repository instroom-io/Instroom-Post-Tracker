'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateAgency } from '@/lib/actions/agencies'
import type { Agency } from '@/lib/types'

interface AgencySettingsFormProps {
  agency: Agency
}

export function AgencySettingsForm({ agency }: AgencySettingsFormProps) {
  const [name, setName] = useState(agency.name)
  const [logoUrl, setLogoUrl] = useState(agency.logo_url ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updateAgency(agency.id, { name, logo_url: logoUrl })
      if (result?.error) {
        setError(result.error)
        return
      }
      toast.success('Agency settings saved.')
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-foreground-light">Agency Name</label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          disabled={isPending}
          placeholder="Armful Media"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-foreground-light">Logo URL</label>
        <Input
          value={logoUrl}
          onChange={e => setLogoUrl(e.target.value)}
          disabled={isPending}
          placeholder="https://example.com/logo.png"
        />
        <p className="text-[11px] text-foreground-muted">
          Shown in the header and on your brand workspaces. Leave blank to use initials.
        </p>
      </div>

      {error && <p className="text-[11px] text-destructive">{error}</p>}

      <div>
        <Button variant="primary" size="md" loading={isPending} onClick={handleSave}>
          Save changes
        </Button>
      </div>
    </div>
  )
}
