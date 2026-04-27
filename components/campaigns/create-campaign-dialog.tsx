'use client'

import { useState, useTransition } from 'react'
import { Plus, Info } from '@phosphor-icons/react'
import { PlatformIcon } from '@/components/ui/platform-icon'
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
import { TagInput } from '@/components/ui/tag-input'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { createCampaign } from '@/lib/actions/campaigns'
import type { Platform } from '@/lib/types'

interface CreateCampaignDialogProps {
  workspaceId: string
  defaultOpen?: boolean
}

const PLATFORMS: { value: Platform; label: string; color: string }[] = [
  { value: 'instagram', label: 'Instagram', color: 'hsl(var(--platform-instagram))' },
  { value: 'tiktok',    label: 'TikTok',    color: 'hsl(var(--platform-tiktok))' },
  { value: 'youtube',   label: 'YouTube',   color: 'hsl(var(--platform-youtube))' },
]

export function CreateCampaignDialog({ workspaceId, defaultOpen = false }: CreateCampaignDialogProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([])
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [trackingConfigs, setTrackingConfigs] = useState<
    Record<Platform, { hashtags: string[]; mentions: string[] }>
  >({} as Record<Platform, { hashtags: string[]; mentions: string[] }>)

  function togglePlatform(platform: Platform) {
    setSelectedPlatforms((prev) => {
      if (prev.includes(platform)) {
        // Remove config for deselected platform
        setTrackingConfigs((cfg) => {
          const next = { ...cfg }
          delete next[platform]
          return next
        })
        return prev.filter((p) => p !== platform)
      }
      // Init empty config for newly selected platform
      setTrackingConfigs((cfg) => ({
        ...cfg,
        [platform]: { hashtags: [], mentions: [] },
      }))
      return [...prev, platform]
    })
  }

  function updateConfig(platform: Platform, field: 'hashtags' | 'mentions', tags: string[]) {
    setTrackingConfigs((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: tags },
    }))
  }

  function handleClose() {
    setOpen(false)
    setName('')
    setSelectedPlatforms([])
    setStartDate('')
    setEndDate('')
    setTrackingConfigs({} as Record<Platform, { hashtags: string[]; mentions: string[] }>)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (endDate && startDate && new Date(endDate) < new Date(startDate)) {
      setError('End date must be on or after start date.')
      return
    }

    const tracking_configs = selectedPlatforms
      .map((p) => ({
        platform: p,
        hashtags: trackingConfigs[p]?.hashtags ?? [],
        mentions: trackingConfigs[p]?.mentions ?? [],
      }))
      .filter((tc) => tc.hashtags.length > 0 || tc.mentions.length > 0)

    startTransition(async () => {
      const result = await createCampaign(workspaceId, {
        name,
        platforms: selectedPlatforms,
        start_date: startDate,
        end_date: endDate || undefined,
        tracking_configs: tracking_configs.length > 0 ? tracking_configs : undefined,
      })

      if (result?.error) {
        setError(result.error)
        return
      }

      toast.success('Campaign created')
      handleClose()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); else setOpen(true) }}>
      <DialogTrigger>
        <Button variant="primary" size="sm" data-testid="create-campaign-btn">
          <Plus size={13} />
          New campaign
        </Button>
      </DialogTrigger>

      <DialogContent size={selectedPlatforms.length > 0 ? 'lg' : 'md'}>
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
              data-testid="campaign-name-input"
            />

            {/* Platforms */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[12px] font-medium text-foreground-light">
                Platforms
              </p>
              <div className="flex gap-2">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    data-testid={`platform-btn-${p.value}`}
                    onClick={() => togglePlatform(p.value)}
                    className={`rounded-lg border px-3 py-1.5 transition-colors ${
                      selectedPlatforms.includes(p.value)
                        ? 'border-brand bg-brand-muted'
                        : 'border-border bg-background-surface hover:border-brand/50'
                    }`}
                  >
                    <PlatformIcon platform={p.value} size={16} />
                  </button>
                ))}
              </div>
            </div>

            {/* Inline tracking config — appears per selected platform */}
            {selectedPlatforms.length > 0 && (
              <div className="flex flex-col gap-0 overflow-hidden rounded-lg border border-border">
                {selectedPlatforms.map((platform, idx) => {
                  const p = PLATFORMS.find((x) => x.value === platform)!
                  return (
                    <div
                      key={platform}
                      className={`space-y-3 px-4 py-3 ${idx > 0 ? 'border-t border-border' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={platform} size={13} />
                        <span className="text-[11px] font-semibold text-foreground-muted">
                          {p.label}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <TagInput
                          label="Hashtags"
                          tags={trackingConfigs[platform]?.hashtags ?? []}
                          onChange={(tags) => updateConfig(platform, 'hashtags', tags)}
                          prefix="#"
                          placeholder="brandname, collab"
                        />
                        <TagInput
                          label="Mentions"
                          tags={trackingConfigs[platform]?.mentions ?? []}
                          onChange={(tags) => updateConfig(platform, 'mentions', tags)}
                          prefix="@"
                          placeholder="brandhandle"
                        />
                      </div>
                    </div>
                  )
                })}
                <div className="border-t border-border bg-background-muted px-4 py-2">
                  <p className="text-[10px] text-foreground-subtle">
                    Required for posts to be detected by the posts worker
                  </p>
                </div>
              </div>
            )}

            {/* Date range */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-[12px] font-medium text-foreground-light">Start date</span>
                  <Tooltip
                    side="right"
                    content={
                      <div className="space-y-2">
                        <p className="font-medium">Set this to the date products were delivered to influencers.</p>
                        <div className="space-y-1">
                          <p className="font-medium text-background/70">How it works:</p>
                          <ul className="space-y-1 pl-1">
                            <li>• The system tracks posts from the moment each influencer is added — not from this date</li>
                            <li>• This date defines your campaign window for analytics and reporting</li>
                            <li>• Posts outside this window will not be counted</li>
                            <li>• If no posts are found by day 10, a follow-up reminder is sent to your team</li>
                            <li>• A second reminder follows at day 13</li>
                          </ul>
                        </div>
                        <p className="text-background/70">Only add influencers who just received their delivery and have not posted yet.</p>
                      </div>
                    }
                  >
                    <Info size={12} className="cursor-help text-foreground-muted" />
                  </Tooltip>
                </div>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  data-testid="campaign-start-date"
                />
              </div>
              <Input
                label="End date (optional)"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                data-testid="campaign-end-date"
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
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isPending}
              data-testid="campaign-submit-btn"
            >
              Create campaign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
