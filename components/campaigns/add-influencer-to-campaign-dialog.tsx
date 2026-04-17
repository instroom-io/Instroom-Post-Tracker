'use client'

import { useState, useTransition, useRef } from 'react'
import { UserPlus, ArrowLeft, CheckCircle, Warning, XCircle, DownloadSimple, UploadSimple } from '@phosphor-icons/react'
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
import {
  addInfluencerToCampaign,
  addInfluencersBatch,
  validateInfluencerHandles,
  type HandleValidationResult,
} from '@/lib/actions/influencers'
import { getInfluencerLabel, getInitials } from '@/lib/utils'
import { PlatformIcon } from '@/components/ui/platform-icon'
import { cn } from '@/lib/utils'
import type { Platform } from '@/lib/types'

interface Influencer {
  id: string
  ig_handle: string | null
  tiktok_handle: string | null
  youtube_handle: string | null
  profile_pic_url: string | null
}

interface Props {
  workspaceId: string
  campaignId: string
  availableInfluencers: Influencer[]
  campaignPlatforms: Platform[]
}

type Mode = 'select' | 'batch' | 'validate'
type BatchPlatform = 'tiktok' | 'instagram' | 'youtube'

const ALL_BATCH_PLATFORMS: { key: BatchPlatform; label: string }[] = [
  { key: 'tiktok', label: 'TikTok' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'youtube', label: 'YouTube' },
]

// ── CSV template helpers ──────────────────────────────────────────────────────

type ParseTemplateResult = { handles: Record<BatchPlatform, string[]>; total: number }

function parseCsvTemplate(
  text: string,
  allowedPlatforms?: BatchPlatform[]
): ParseTemplateResult | { error: string } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { error: 'Template appears empty. Add at least one row below the header.' }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^@/, ''))
  const colMap: Record<BatchPlatform, number> = {
    tiktok: headers.indexOf('tiktok_handle'),
    instagram: headers.indexOf('ig_handle'),
    youtube: headers.indexOf('youtube_handle'),
  }

  const recognized = Object.values(colMap).some(i => i !== -1)
  if (!recognized) return { error: 'Unrecognized format. Please use the provided template.' }

  const result: Record<BatchPlatform, string[]> = { tiktok: [], instagram: [], youtube: [] }

  for (let i = 1; i < Math.min(lines.length, 501); i++) {
    const cells = lines[i].split(',').map(c => c.trim().replace(/^@/, ''))
    for (const p of (['tiktok', 'instagram', 'youtube'] as BatchPlatform[])) {
      if (colMap[p] === -1) continue
      if (allowedPlatforms && !allowedPlatforms.includes(p)) continue
      const h = cells[colMap[p]] ?? ''
      if (h.length > 0 && h.length <= 100) result[p].push(h)
    }
  }

  const total = result.tiktok.length + result.instagram.length + result.youtube.length
  if (total === 0) return { error: 'No handles found in the file. Check that you filled in the template correctly.' }

  return { handles: result, total }
}

function downloadTemplate(platforms: BatchPlatform[]) {
  const colHeaders = [
    platforms.includes('tiktok') ? 'tiktok_handle' : null,
    platforms.includes('instagram') ? 'ig_handle' : null,
    platforms.includes('youtube') ? 'youtube_handle' : null,
  ].filter(Boolean).join(',')

  const sampleRow = [
    platforms.includes('tiktok') ? 'example_tiktok' : null,
    platforms.includes('instagram') ? 'example_instagram' : null,
    platforms.includes('youtube') ? 'example_youtube' : null,
  ].filter(Boolean).join(',')

  const csv = `${colHeaders}\n${sampleRow}\n`
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'influencer-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ─────────────────────────────────────────────────────────────────────────────

function InfluencerAvatar({ handle, profilePicUrl }: { handle: string; profilePicUrl: string | null }) {
  const [failed, setFailed] = useState(false)
  if (profilePicUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profilePicUrl}
        alt=""
        className="h-6 w-6 flex-shrink-0 rounded-full object-cover"
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-muted text-[9px] font-bold text-brand">
      {getInitials(handle)}
    </div>
  )
}

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
  campaignPlatforms,
}: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Select mode state
  const [selectedId, setSelectedId] = useState<string>('')

  // Batch mode state
  const [batchText, setBatchText] = useState('')

  // Filter batch tabs to campaign platforms only; default to first
  const batchTabs = ALL_BATCH_PLATFORMS.filter((t) =>
    campaignPlatforms.includes(t.key as Platform)
  )
  const defaultBatchPlatform = (batchTabs[0]?.key ?? 'tiktok') as BatchPlatform
  const [batchPlatform, setBatchPlatform] = useState<BatchPlatform>(defaultBatchPlatform)

  // Validate mode state — augmented with platform for multi-platform CSV imports
  const [validationResults, setValidationResults] = useState<(HandleValidationResult & { platform: BatchPlatform })[]>([])
  const [selectedHandles, setSelectedHandles] = useState<Set<string>>(new Set())

  // CSV import state
  const csvFileRef = useRef<HTMLInputElement>(null)
  const [csvError, setCsvError] = useState<string | null>(null)

  // Shared
  const [productSentAt, setProductSentAt] = useState<string>('')

  // Only show influencers who have a handle on at least one campaign platform
  const platformFilteredInfluencers = availableInfluencers.filter((inf) =>
    campaignPlatforms.some((p) =>
      (p === 'instagram' && !!inf.ig_handle) ||
      (p === 'tiktok' && !!inf.tiktok_handle) ||
      (p === 'youtube' && !!inf.youtube_handle)
    )
  )

  const hasAvailable = platformFilteredInfluencers.length > 0
  const [mode, setMode] = useState<Mode>(hasAvailable ? 'select' : 'batch')

  const parsedHandles = parseHandles(batchText)

  function handleOpenChange(val: boolean) {
    setOpen(val)
    if (!val) {
      setSelectedId('')
      setBatchText('')
      setBatchPlatform(defaultBatchPlatform)
      setValidationResults([])
      setSelectedHandles(new Set())
      setProductSentAt('')
      setCsvError(null)
      if (csvFileRef.current) csvFileRef.current.value = ''
      setMode(platformFilteredInfluencers.length > 0 ? 'select' : 'batch')
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

  // Validate handles from the manual textarea (single platform)
  function handleValidate() {
    if (parsedHandles.length === 0) return
    startTransition(async () => {
      const results = await validateInfluencerHandles(workspaceId, batchPlatform, parsedHandles)
      setValidationResults(results.map(r => ({ ...r, platform: batchPlatform })))
      const autoSelected = new Set(
        results
          .filter((r) => r.status === 'valid' || r.status === 'private')
          .map((r) => r.handle)
      )
      setSelectedHandles(autoSelected)
      setMode('validate')
    })
  }

  // Validate handles from CSV template upload (multi-platform)
  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCsvTemplate(text, campaignPlatforms as BatchPlatform[])
      if ('error' in parsed) {
        setCsvError(parsed.error)
        return
      }
      runCsvValidation(parsed.handles)
    }
    reader.readAsText(file)
    if (csvFileRef.current) csvFileRef.current.value = ''
  }

  function runCsvValidation(handlesByPlatform: Record<BatchPlatform, string[]>) {
    startTransition(async () => {
      const platforms = (campaignPlatforms as BatchPlatform[]).filter(p => handlesByPlatform[p].length > 0)
      const allResults: (HandleValidationResult & { platform: BatchPlatform })[] = []
      await Promise.all(
        platforms.map(async p => {
          const results = await validateInfluencerHandles(workspaceId, p, handlesByPlatform[p])
          allResults.push(...results.map(r => ({ ...r, platform: p })))
        })
      )
      setValidationResults(allResults)
      const autoSelected = new Set(
        allResults
          .filter(r => r.status === 'valid' || r.status === 'private')
          .map(r => r.handle)
      )
      setSelectedHandles(autoSelected)
      setMode('validate')
    })
  }

  function toggleHandle(handle: string) {
    setSelectedHandles((prev) => {
      const next = new Set(prev)
      if (next.has(handle)) next.delete(handle)
      else next.add(handle)
      return next
    })
  }

  function handleConfirmAdd() {
    const handles = [...selectedHandles]
    if (handles.length === 0) return
    startTransition(async () => {
      // Group by platform using result data
      const byPlatform: Record<BatchPlatform, string[]> = { tiktok: [], instagram: [], youtube: [] }
      for (const handle of handles) {
        const r = validationResults.find(v => v.handle === handle)
        const platform = r?.platform ?? batchPlatform
        byPlatform[platform].push(handle)
      }
      const platformsToAdd = (['tiktok', 'instagram', 'youtube'] as BatchPlatform[])
        .filter(p => byPlatform[p].length > 0)

      let totalAdded = 0
      let totalSkipped = 0
      const errors: string[] = []
      await Promise.all(
        platformsToAdd.map(async p => {
          const result = await addInfluencersBatch(workspaceId, byPlatform[p], p, campaignId, productSentAt || null)
          if (result?.error) errors.push(result.error)
          else { totalAdded += result.added; totalSkipped += result.skipped }
        })
      )
      if (errors.length) {
        errors.forEach(e => toast.error(e))
        return
      }
      toast.success(
        totalSkipped > 0
          ? `${totalAdded} added, ${totalSkipped} already existed`
          : `${totalAdded} influencer${totalAdded !== 1 ? 's' : ''} added`
      )
      handleOpenChange(false)
    })
  }

  const warningResults = validationResults.filter((r) => r.status !== 'valid')
  const selectedCount = selectedHandles.size
  const deselectedCount = validationResults.length - selectedCount

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
              {(mode === 'batch' && hasAvailable) && (
                <button
                  type="button"
                  onClick={() => setMode('select')}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-background-muted transition-colors"
                  aria-label="Back to select"
                >
                  <ArrowLeft size={14} />
                </button>
              )}
              {mode === 'validate' && (
                <button
                  type="button"
                  onClick={() => setMode('batch')}
                  className="flex h-6 w-6 items-center justify-center rounded-md text-foreground-muted hover:text-foreground hover:bg-background-muted transition-colors"
                  aria-label="Back to batch"
                >
                  <ArrowLeft size={14} />
                </button>
              )}
              <DialogTitle>
                {mode === 'select' && 'Add influencer to campaign'}
                {mode === 'batch' && 'Add new influencers'}
                {mode === 'validate' && 'Review handles'}
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* ── Select mode ── */}
          {mode === 'select' && (
            <>
              <DialogBody className="space-y-3">
                <div className="max-h-60 overflow-y-auto rounded-lg border border-border">
                  {platformFilteredInfluencers.map((inf) => {
                    const label =
                      (campaignPlatforms.includes('instagram') && inf.ig_handle) ||
                      (campaignPlatforms.includes('tiktok') && inf.tiktok_handle) ||
                      (campaignPlatforms.includes('youtube') && inf.youtube_handle) ||
                      getInfluencerLabel(inf)
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
                        <InfluencerAvatar
                          handle={label}
                          profilePicUrl={inf.profile_pic_url
                            ? `/api/proxy-image?url=${encodeURIComponent(inf.profile_pic_url)}`
                            : null}
                        />
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

                <button
                  type="button"
                  onClick={() => setMode('batch')}
                  className="text-[12px] text-brand hover:underline"
                >
                  + Add new influencers
                </button>

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
                    When products were delivered{campaignPlatforms.includes('tiktok') ? ' — limits how far back TikTok is scraped' : ''}.
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
                {/* Platform tabs — filtered to campaign platforms */}
                {batchTabs.length > 1 && (
                  <div className="flex gap-1.5">
                    {batchTabs.map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setBatchPlatform(tab.key)}
                        className={cn(
                          'flex items-center justify-center rounded-lg border px-2.5 py-1.5 transition-colors',
                          batchPlatform === tab.key
                            ? 'border-brand/40 bg-brand/10'
                            : 'border-border bg-background-surface text-foreground-muted hover:text-foreground hover:bg-background-muted'
                        )}
                      >
                        <PlatformIcon platform={tab.key} size={14} />
                      </button>
                    ))}
                  </div>
                )}

                {batchTabs.length === 1 && (
                  <p className="text-[11px] text-foreground-muted">
                    Platform: <span className="inline-flex items-center gap-1 font-medium text-foreground"><PlatformIcon platform={batchTabs[0].key} size={13} />{batchTabs[0].label}</span>
                  </p>
                )}

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
                    When products were delivered{campaignPlatforms.includes('tiktok') ? ' — limits how far back TikTok is scraped' : ''}.
                  </p>
                </div>

                {/* Manual textarea */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-foreground-light">Paste handles</span>
                  <textarea
                    value={batchText}
                    onChange={(e) => setBatchText(e.target.value)}
                    placeholder="Paste handles without @, one per line or comma-separated&#10;e.g. kellyx, debalans, nadia"
                    rows={4}
                    className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-[13px] text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-colors"
                  />
                  {parsedHandles.length > 0 && (
                    <p className="text-[11px] text-foreground-muted">
                      {parsedHandles.length} handle{parsedHandles.length !== 1 ? 's' : ''} detected
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-[11px] text-foreground-subtle">or import from template</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* Template download + upload */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => downloadTemplate(campaignPlatforms as BatchPlatform[])}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand/5 px-3 py-2.5 text-left transition-colors hover:bg-brand/10"
                  >
                    <div>
                      <p className="text-[12px] font-medium text-foreground">Download template</p>
                      <p className="text-[11px] text-foreground-muted mt-0.5">
                        {campaignPlatforms.map(p =>
                          p === 'tiktok' ? 'tiktok_handle' : p === 'instagram' ? 'ig_handle' : 'youtube_handle'
                        ).join(', ')} columns
                      </p>
                    </div>
                    <DownloadSimple size={14} className="flex-shrink-0 text-brand" />
                  </button>

                  <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-border px-3 py-3 transition-colors hover:border-brand/40 hover:bg-brand/5">
                    <UploadSimple size={15} className="flex-shrink-0 text-foreground-muted" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[12px] font-medium text-foreground">Upload CSV</span>
                      <span className="text-[12px] text-foreground-muted"> · .csv or .txt</span>
                    </div>
                    <input
                      ref={csvFileRef}
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={handleCsvUpload}
                    />
                  </label>

                  {csvError && (
                    <p className="flex items-center gap-1.5 text-[11px] text-destructive">
                      <XCircle size={11} className="flex-shrink-0" />
                      {csvError}
                    </p>
                  )}
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
                  onClick={handleValidate}
                >
                  Verify
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── Validate mode ── */}
          {mode === 'validate' && (
            <>
              <DialogBody className="space-y-3">
                {/* Results table */}
                <div className="overflow-hidden rounded-lg border border-border">
                  <div className="grid grid-cols-[16px_auto_1fr_auto_auto] gap-3 border-b border-border bg-background-muted px-3 py-2">
                    <span />
                    <span />
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground-subtle">Handle</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground-subtle">Platform</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-foreground-subtle">Status</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-border">
                    {validationResults.map((r) => {
                      const isChecked = selectedHandles.has(r.handle)
                      const isNotFound = r.status === 'not_found'
                      return (
                        <button
                          key={`${r.platform}:${r.handle}`}
                          type="button"
                          onClick={() => !isNotFound && toggleHandle(r.handle)}
                          disabled={isNotFound}
                          className={cn(
                            'grid w-full grid-cols-[16px_auto_1fr_auto_auto] gap-3 px-3 py-2.5 text-left transition-colors',
                            isNotFound
                              ? 'cursor-default opacity-50'
                              : 'hover:bg-background-muted cursor-pointer',
                            r.status === 'valid' && isChecked && 'bg-brand/5',
                            r.status === 'private' && isChecked && 'bg-warning/5',
                          )}
                        >
                          {/* Checkbox */}
                          <div className={cn(
                            'mt-0.5 flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border',
                            isChecked && r.status === 'valid' && 'border-brand bg-brand',
                            isChecked && r.status === 'private' && 'border-warning bg-warning',
                            !isChecked && 'border-border bg-transparent',
                          )}>
                            {isChecked && (
                              <svg viewBox="0 0 8 6" className="h-2 w-2 fill-white">
                                <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          {/* Avatar */}
                          <InfluencerAvatar handle={r.handle} profilePicUrl={r.profile_pic_url ?? null} />
                          {/* Handle */}
                          <span className="font-mono text-[12px] text-foreground">
                            <span className="text-foreground-muted">@</span>{r.handle}
                          </span>
                          {/* Platform */}
                          <PlatformIcon platform={r.platform} size={13} />
                          {/* Status badge */}
                          {r.status === 'valid' && (
                            <span className="flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
                              <CheckCircle size={10} />
                              Verified
                            </span>
                          )}
                          {r.status === 'private' && (
                            <span className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                              <Warning size={10} />
                              Private
                            </span>
                          )}
                          {r.status === 'not_found' && (
                            <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                              <XCircle size={10} />
                              Not found
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Warning banner if any issues */}
                {warningResults.length > 0 && (
                  <div className="flex gap-2.5 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5">
                    <Warning size={13} className="mt-0.5 flex-shrink-0 text-warning" />
                    <p className="text-[11px] leading-relaxed text-foreground-light">
                      {warningResults.filter((r) => r.status === 'private').length > 0 && (
                        <span>Private accounts may not return posts. </span>
                      )}
                      {warningResults.filter((r) => r.status === 'not_found').length > 0 && (
                        <span>Not-found handles were deselected automatically. </span>
                      )}
                      You can still add the selected influencers.
                    </p>
                  </div>
                )}
              </DialogBody>

              <DialogFooter>
                <span className="mr-auto text-[11px] text-foreground-subtle">
                  {selectedCount} selected{deselectedCount > 0 ? ` · ${deselectedCount} deselected` : ''}
                </span>
                <Button variant="secondary" size="md" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={selectedCount === 0 || isPending}
                  loading={isPending}
                  onClick={handleConfirmAdd}
                >
                  Add {selectedCount > 0 ? selectedCount : ''} influencer{selectedCount !== 1 ? 's' : ''}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
