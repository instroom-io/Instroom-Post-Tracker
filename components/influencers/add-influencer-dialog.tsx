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
import { addInfluencer } from '@/lib/actions/influencers'

interface AddInfluencerDialogProps {
  workspaceId: string
  campaignId?: string
  trigger?: React.ReactNode
}

export function AddInfluencerDialog({
  workspaceId,
  campaignId,
  trigger,
}: AddInfluencerDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: '',
    ig_handle: '',
    tiktok_handle: '',
    youtube_handle: '',
  })

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    startTransition(async () => {
      const result = await addInfluencer(workspaceId, form, campaignId)

      if (result?.error) {
        setError(result.error)
        return
      }

      toast.success('Influencer added')
      setOpen(false)
      setForm({
        full_name: '',
        ig_handle: '',
        tiktok_handle: '',
        youtube_handle: '',
      })
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        {trigger ?? (
          <Button variant="primary" size="sm">
            <Plus size={13} />
            Add influencer
          </Button>
        )}
      </DialogTrigger>

      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Add influencer</DialogTitle>
          <DialogDescription>
            Add an influencer to your workspace.
            {campaignId && ' They will also be added to this campaign.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            <Input
              label="Full name"
              value={form.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
              placeholder="Jane Smith"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Instagram handle"
                value={form.ig_handle}
                onChange={(e) =>
                  handleChange(
                    'ig_handle',
                    e.target.value.replace(/^@/, '')
                  )
                }
                placeholder="janesmithig"
                hint="Without @"
              />
              <Input
                label="TikTok handle"
                value={form.tiktok_handle}
                onChange={(e) =>
                  handleChange(
                    'tiktok_handle',
                    e.target.value.replace(/^@/, '')
                  )
                }
                placeholder="janesmithtt"
                hint="Without @"
              />
            </div>

            <Input
              label="YouTube handle"
              value={form.youtube_handle}
              onChange={(e) =>
                handleChange(
                  'youtube_handle',
                  e.target.value.replace(/^@/, '')
                )
              }
              placeholder="janesmith"
              hint="Without @"
            />

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
              Add influencer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
