'use client'

import { useState, useTransition } from 'react'
import { UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { addInfluencerToCampaign } from '@/lib/actions/influencers'

interface Influencer {
  id: string
  full_name: string
  ig_handle: string | null
  tiktok_handle: string | null
}

interface Props {
  workspaceId: string
  campaignId: string
  availableInfluencers: Influencer[]
}

export function AddInfluencerToCampaignDialog({
  workspaceId,
  campaignId,
  availableInfluencers,
}: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [selectedId, setSelectedId] = useState<string>('')

  function handleAdd() {
    if (!selectedId) return
    startTransition(async () => {
      const result = await addInfluencerToCampaign(workspaceId, campaignId, selectedId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Influencer added to campaign')
        setOpen(false)
        setSelectedId('')
      }
    })
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <UserPlus size={13} />
        Add influencer
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add influencer to campaign</DialogTitle>
          </DialogHeader>

          {availableInfluencers.length === 0 ? (
            <p className="py-4 text-center text-[13px] text-foreground-lighter">
              All workspace influencers are already in this campaign.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
                {availableInfluencers.map((inf) => (
                  <button
                    key={inf.id}
                    type="button"
                    onClick={() => setSelectedId(inf.id)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-background-muted first:rounded-t-lg last:rounded-b-lg ${
                      selectedId === inf.id ? 'bg-brand/10 border-l-2 border-brand' : ''
                    }`}
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand/15 text-[11px] font-bold text-brand">
                      {inf.full_name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{inf.full_name}</p>
                      <p className="text-[11px] text-foreground-lighter">
                        {[inf.ig_handle && `@${inf.ig_handle}`, inf.tiktok_handle && `@${inf.tiktok_handle}`]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!selectedId || isPending}
                  loading={isPending}
                  onClick={handleAdd}
                >
                  Add to campaign
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
