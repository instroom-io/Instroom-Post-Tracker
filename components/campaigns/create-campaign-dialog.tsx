'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createCampaign } from '@/lib/actions/campaigns'
import type { Platform } from '@/lib/types'

interface CreateCampaignDialogProps {
  workspaceId: string
}

const platforms: { value: Platform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
]

export function CreateCampaignDialog({ workspaceId }: CreateCampaignDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([])
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await createCampaign(workspaceId, {
        name,
        platforms: selectedPlatforms,
        start_date: startDate,
        end_date: endDate,
      })

      if (result?.error) {
        setError(result.error)
        return
      }

      toast.success('Campaign created')
      setOpen(false)
      setName('')
      setSelectedPlatforms([])
      setStartDate('')
      setEndDate('')
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="primary" size="sm">
          <Plus size={13} />
          New campaign
        </Button>
      </DialogTrigger>

      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Create campaign</DialogTitle>
          <DialogDescription>
            Define your campaign's tracking window and platforms.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <Input
              label="Campaign name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Summer Collection 2025"
              required
              error={undefined}
            />

            {/* Platforms */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[12px] font-medium text-foreground-light">
                Platforms
              </p>
              <div className="flex gap-2">
                {platforms.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => togglePlatform(p.value)}
                    className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      selectedPlatforms.includes(p.value)
                        ? 'border-brand bg-brand-muted text-brand'
                        : 'border-border bg-background-surface text-foreground-lighter hover:border-brand/50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
              <Input
                label="End date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-[11px] text-destructive">{error}</p>
            )}
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isPending}
            >
              Create campaign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
