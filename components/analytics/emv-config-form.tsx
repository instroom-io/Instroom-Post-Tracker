'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { PlatformLogo } from '@/components/ui/platform-icon'
import { Button } from '@/components/ui/button'
import { updateEmvConfig } from '@/lib/actions/analytics'
import type { EmvConfig, Platform } from '@/lib/types'

interface EmvConfigFormProps {
  workspaceId: string
  configs: EmvConfig[]
  canEdit: boolean
}


const PLATFORMS: Platform[] = ['instagram', 'tiktok', 'youtube']

export function EmvConfigForm({ workspaceId, configs, canEdit }: EmvConfigFormProps) {
  const configMap = Object.fromEntries(configs.map((c) => [c.platform, c.cpm_rate]))

  const [rates, setRates] = useState<Record<string, string>>({
    instagram: String(configMap['instagram'] ?? '5.20'),
    tiktok: String(configMap['tiktok'] ?? '3.80'),
    youtube: String(configMap['youtube'] ?? '7.50'),
  })

  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const results = await Promise.all(
        PLATFORMS.map((platform) =>
          updateEmvConfig(workspaceId, platform, parseFloat(rates[platform] ?? '0'))
        )
      )
      const error = results.find((r) => r?.error)?.error
      if (error) {
        toast.error(error)
      } else {
        toast.success('EMV config saved.')
      }
    })
  }

  return (
    <div className="space-y-4">
      {PLATFORMS.map((platform) => (
        <div key={platform} className="flex items-center gap-4">
          <div className="w-24">
            <PlatformLogo platform={platform} size={13} className="text-[12px] font-medium text-foreground" />
            <p className="text-[11px] text-foreground-lighter">CPM rate</p>
          </div>
          <div className="w-32">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={rates[platform]}
              onChange={(e) =>
                setRates((prev) => ({ ...prev, [platform]: e.target.value }))
              }
              disabled={!canEdit || isPending}
              hint={`$${rates[platform]} per 1,000 views`}
            />
          </div>
        </div>
      ))}

      {canEdit && (
        <Button
          variant="primary"
          size="md"
          loading={isPending}
          onClick={handleSave}
        >
          Save EMV config
        </Button>
      )}

      {!canEdit && (
        <p className="text-[11px] text-foreground-muted">
          Only admins and owners can edit EMV rates.
        </p>
      )}
    </div>
  )
}
