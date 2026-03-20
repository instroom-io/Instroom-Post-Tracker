'use client'

import { useState, useTransition } from 'react'
import { UserPlus, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { addInfluencerToCampaign, addInfluencersBatch } from '@/lib/actions/influencers'
import { getInfluencerLabel } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Influencer {
  id: string
  ig_handle: string | null
  tiktok_handle: string | null
  youtube_handle: string | null
}

interface Props {
  workspaceId: string
  campaignId: string
  availableInfluencers: Influencer[]
}

type Mode = 'select' | 'batch'
type BatchPlatform = 'tiktok' | 'instagram' | 'youtube'

function parseHandles(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((h) => h.trim().replace(/^@/, ''))
    .filter(Boolean)
}

export function AddInfluencerToCampaignDialog({
  workspaceId,
  campaignId,
  availableInfluencers,
}: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Select mode state
  const [selectedId, setSelectedId] = useState<string>('')

  // Batch mode state
  const [batchText, setBatchText] = useState('')
  const [batchPlatform, setBatchPlatform] = useState<BatchPlatform>('tiktok')

  // Shared
  const [productSentAt, setProductSentAt] = useState<string>('')

  const hasAvailable = availableInfluencers.length > 0
  const [mode, setMode] = useState<Mode>(hasAvailable ? 'select' : 'batch')

  const parsedHandles = parseHandles(batchText)

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) {
      setSelectedId('')
      setBatchText('')
      setBatchPlatform('tiktok')
      setProductSentAt('')
      setMode(hasAvailable ? 'select' : 'batch')
    }
  }

  function handleSelectAdd() {
    if (!selectedId) return
    startTransition(async () => {
      const result = await addInfluencerToCampaign(workspaceId, campaignId, selectedId, productSentAt || null)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Influencer added to campaign')
        handleOpenChange(false)
      }
    })
  }

  function handleBatchAdd() {
    if (parsedHandles.length === 0) return
    startTransition(async () => {
      const result = await addInfluencersBatch(workspaceId, parsedHandles, batchPlatform, campaignId, productSentAt || null)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(
          result.skipped > 0
            ? `${result.added} added, ${result.skipped} already existed`
            : `${result.added} influencer${result.added !== 1 ? 's' : ''} added`
        )
        handleOpenChange(false)
      }
    })
  }

  const batchTabs: { key: BatchPlatform; label: string }[] = [
    { key: 'tiktok', label: 'TikTok' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'youtube', label: 'YouTube' },
  ]

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <UserPlus size={13} />
        Add influencer
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent size="md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {mode === 'batch' && hasAvailable && (
                <button
                  type="button"
                  onClick={() => setMode('select')}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-background-muted transition-colors"
                  aria-label="Back to select"
                >
                  <ArrowLeft size={14} />
                </button>
              )}
              <DialogTitle>
                {mode === 'select' ? 'Add influencer to campaign' : 'Add new influencers'}
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* ── Select mode ── */}
          {mode === 'select' && (
            <>
              <DialogBody className="space-y-3">
                <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
                  {availableInfluencers.map((inf) => {
                    const label = getInfluencerLabel(inf)
                    return (
                      <button
                        key={inf.id}
                        type="button"
                        onClick={() => setSelectedId(inf.id)}
                        className={cn(
                          'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-background-muted first:rounded-t-lg last:rounded-b-lg',
                          selectedId === inf.id && 'bg-brand/10 border-l-2 border-brand'
                        )}
                      >
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-brand/15 text-[11px] font-bold text-brand">
                          {label[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium text-foreground">@{label}</p>
                          <p className="text-[11px] text-foreground-lighter">
                            {[
                              inf.ig_handle && `ig: @${inf.ig_handle}`,
                              inf.tiktok_handle && `tt: @${inf.tiktok_handle}`,
                              inf.youtube_handle && `yt: @${inf.youtube_handle}`,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Link to batch mode */}
                <button
                  type="button"
                  onClick={() => setMode('batch')}
                  className="text-[12px] text-brand hover:underline"
                >
                  + Add new influencers
                </button>

                {/* Product sent date */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                    Product sent date <span className="normal-case text-foreground-subtle">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={productSentAt}
                    onChange={(e) => setProductSentAt(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-[11px] text-foreground-subtle">
                    When products were delivered — limits how far back TikTok is scraped.
                  </p>
                </div>
              </DialogBody>

              <DialogFooter>
                <Button variant="secondary" size="md" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={!selectedId || isPending}
                  loading={isPending}
                  onClick={handleSelectAdd}
                >
                  Add to campaign
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── Batch mode ── */}
          {mode === 'batch' && (
            <>
              <DialogBody className="space-y-4">
                {/* Platform tabs */}
                <div className="flex gap-0 rounded-lg border border-border overflow-hidden">
                  {batchTabs.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setBatchPlatform(tab.key)}
                      className={cn(
                        'flex-1 py-2 text-[12px] font-medium transition-colors',
                        batchPlatform === tab.key
                          ? 'bg-brand text-white'
                          : 'text-foreground-muted hover:text-foreground hover:bg-background-muted'
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Product sent date */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                    Product sent date <span className="normal-case text-foreground-subtle">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={productSentAt}
                    onChange={(e) => setProductSentAt(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="text-[11px] text-foreground-subtle">
                    When products were delivered — limits how far back TikTok is scraped.
                  </p>
                </div>

                {/* Textarea */}
                <div className="space-y-1.5">
                  <textarea
                    value={batchText}
                    onChange={(e) => setBatchText(e.target.value)}
                    placeholder="Paste handles, one per line or comma-separated&#10;e.g. kellyx, debalans, nadia"
                    rows={5}
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors"
                  />
                  <p className="text-[11px] text-foreground-muted">
                    {parsedHandles.length > 0
                      ? `${parsedHandles.length} handle${parsedHandles.length !== 1 ? 's' : ''} detected`
                      : 'Enter handles without @'}
                  </p>
                </div>
              </DialogBody>

              <DialogFooter>
                <Button variant="secondary" size="md" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={parsedHandles.length === 0 || isPending}
                  loading={isPending}
                  onClick={handleBatchAdd}
                >
                  Add {parsedHandles.length > 0 ? parsedHandles.length : ''} influencer{parsedHandles.length !== 1 ? 's' : ''}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
