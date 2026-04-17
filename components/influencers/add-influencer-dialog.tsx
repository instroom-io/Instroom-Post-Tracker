'use client'

import { useState, useTransition, useRef } from 'react'
import { Plus, UploadSimple, CheckCircle, XCircle, FileText, DownloadSimple } from '@phosphor-icons/react'
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
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  addInfluencersBatch,
  validateInfluencerHandles,
  type HandleValidationResult,
} from '@/lib/actions/influencers'

interface AddInfluencerDialogProps {
  workspaceId: string
  campaignId?: string
  trigger?: React.ReactNode
}

type Mode = 'manual' | 'csv'
type CsvPlatform = 'instagram' | 'tiktok' | 'youtube'
type CsvImportStep = 'upload' | 'validating' | 'review'

const PLATFORMS: { value: CsvPlatform; label: string }[] = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
]

function parseHandles(input: string): string[] {
  return input
    .split('\n')
    .map(h => h.trim().replace(/^@/, ''))
    .filter(Boolean)
}

// ── CSV template helpers ──────────────────────────────────────────────────────

type ParseTemplateResult = { handles: Record<CsvPlatform, string[]>; total: number }

function parseCsvTemplate(
  text: string,
  allowedPlatforms?: CsvPlatform[]
): ParseTemplateResult | { error: string } {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { error: 'Template appears empty. Add at least one row below the header.' }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^@/, ''))
  const colMap: Record<CsvPlatform, number> = {
    tiktok: headers.indexOf('tiktok_handle'),
    instagram: headers.indexOf('ig_handle'),
    youtube: headers.indexOf('youtube_handle'),
  }

  const recognized = Object.values(colMap).some(i => i !== -1)
  if (!recognized) return { error: 'Unrecognized format. Please use the provided template.' }

  const result: Record<CsvPlatform, string[]> = { tiktok: [], instagram: [], youtube: [] }

  for (let i = 1; i < Math.min(lines.length, 501); i++) {
    const cells = lines[i].split(',').map(c => c.trim().replace(/^@/, ''))
    for (const p of (['tiktok', 'instagram', 'youtube'] as CsvPlatform[])) {
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

function downloadTemplate(platforms: CsvPlatform[]) {
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

export function AddInfluencerDialog({
  workspaceId,
  campaignId,
  trigger,
}: AddInfluencerDialogProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('manual')

  // ── Manual batch state ────────────────────────────────────────────────────
  const [manualActivePlatform, setManualActivePlatform] = useState<CsvPlatform>('tiktok')
  const [manualHandleInputs, setManualHandleInputs] = useState<Record<CsvPlatform, string>>({
    tiktok: '', instagram: '', youtube: '',
  })
  const [manualStep, setManualStep] = useState<'input' | 'confirm'>('input')
  const [isManualValidating, setIsManualValidating] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [manualResults, setManualResults] = useState<(HandleValidationResult & { platform: CsvPlatform })[]>([])
  const [manualSelected, setManualSelected] = useState<Set<string>>(new Set())

  // ── CSV import state ──────────────────────────────────────────────────────
  const [csvImportStep, setCsvImportStep] = useState<CsvImportStep>('upload')
  const [csvImportFileName, setCsvImportFileName] = useState('')
  const [csvImportError, setCsvImportError] = useState<string | null>(null)
  const [csvImportResults, setCsvImportResults] = useState<(HandleValidationResult & { platform: CsvPlatform })[]>([])
  const [csvImportSelected, setCsvImportSelected] = useState<Set<string>>(new Set())
  const [, startCsvValidateTransition] = useTransition()
  const [isCsvImporting, startCsvImportTransition] = useTransition()
  const csvFileRef = useRef<HTMLInputElement>(null)

  // ── Manual handlers ───────────────────────────────────────────────────────
  async function handleManualValidate() {
    setIsManualValidating(true)
    try {
      const platformsToValidate = (['tiktok', 'instagram', 'youtube'] as CsvPlatform[]).filter(
        p => parseHandles(manualHandleInputs[p]).length > 0
      )
      const allResults: (HandleValidationResult & { platform: CsvPlatform })[] = []
      await Promise.all(
        platformsToValidate.map(async platform => {
          const handles = parseHandles(manualHandleInputs[platform])
          const results = await validateInfluencerHandles(workspaceId, platform, handles)
          allResults.push(...results.map(r => ({ ...r, platform })))
        })
      )
      setManualResults(allResults)
      const autoSelected = new Set(
        allResults
          .filter(r => r.status === 'valid' || r.status === 'private')
          .map(r => `${r.platform}:${r.handle}`)
      )
      setManualSelected(autoSelected)
      setManualStep('confirm')
    } catch {
      toast.error('Validation failed. Please try again.')
    } finally {
      setIsManualValidating(false)
    }
  }

  async function handleManualConfirm() {
    setIsAdding(true)
    try {
      const byPlatform: Record<CsvPlatform, string[]> = { tiktok: [], instagram: [], youtube: [] }
      for (const key of manualSelected) {
        const colonIdx = key.indexOf(':')
        const platform = key.slice(0, colonIdx) as CsvPlatform
        const handle = key.slice(colonIdx + 1)
        byPlatform[platform].push(handle)
      }
      const platformsToAdd = (['tiktok', 'instagram', 'youtube'] as CsvPlatform[]).filter(
        p => byPlatform[p].length > 0
      )
      const errors: string[] = []
      let totalAdded = 0
      let totalSkipped = 0
      await Promise.all(
        platformsToAdd.map(async platform => {
          const result = await addInfluencersBatch(workspaceId, byPlatform[platform], platform)
          if (result.error) {
            errors.push(`${PLATFORMS.find(p => p.value === platform)?.label ?? platform}: ${result.error}`)
          } else {
            totalAdded += result.added
            totalSkipped += result.skipped
          }
        })
      )
      if (errors.length > 0) errors.forEach(e => toast.error(e))
      if (errors.length < platformsToAdd.length) {
        if (totalAdded === 0) {
          toast.info('All handles already exist in this workspace')
        } else if (totalSkipped > 0) {
          toast.success(`Added ${totalAdded} influencer${totalAdded !== 1 ? 's' : ''} — ${totalSkipped} already existed`)
        } else {
          toast.success(`Added ${totalAdded} influencer${totalAdded !== 1 ? 's' : ''}`)
        }
        handleClose()
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  // ── CSV import handlers ───────────────────────────────────────────────────
  function handleCsvFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvImportError(null)
    setCsvImportFileName(file.name)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseCsvTemplate(text)
      if ('error' in parsed) {
        setCsvImportError(parsed.error)
        setCsvImportFileName('')
        return
      }
      runCsvValidation(parsed.handles)
    }
    reader.readAsText(file)
    if (csvFileRef.current) csvFileRef.current.value = ''
  }

  function runCsvValidation(handlesByPlatform: Record<CsvPlatform, string[]>) {
    setCsvImportStep('validating')
    startCsvValidateTransition(async () => {
      const platforms = (['tiktok', 'instagram', 'youtube'] as CsvPlatform[])
        .filter(p => handlesByPlatform[p].length > 0)
      const allResults: (HandleValidationResult & { platform: CsvPlatform })[] = []
      await Promise.all(
        platforms.map(async p => {
          const results = await validateInfluencerHandles(workspaceId, p, handlesByPlatform[p])
          allResults.push(...results.map(r => ({ ...r, platform: p })))
        })
      )
      setCsvImportResults(allResults)
      const autoSelected = new Set(
        allResults
          .filter(r => r.status !== 'not_found')
          .map(r => `${r.platform}:${r.handle}`)
      )
      setCsvImportSelected(autoSelected)
      setCsvImportStep('review')
    })
  }

  function toggleCsvImportHandle(key: string) {
    const result = csvImportResults.find(r => `${r.platform}:${r.handle}` === key)
    if (result?.status === 'not_found') return
    setCsvImportSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleCsvImport() {
    const byPlatform: Record<CsvPlatform, string[]> = { tiktok: [], instagram: [], youtube: [] }
    for (const key of csvImportSelected) {
      const colonIdx = key.indexOf(':')
      const platform = key.slice(0, colonIdx) as CsvPlatform
      const handle = key.slice(colonIdx + 1)
      byPlatform[platform].push(handle)
    }
    const platformsToImport = (['tiktok', 'instagram', 'youtube'] as CsvPlatform[])
      .filter(p => byPlatform[p].length > 0)

    startCsvImportTransition(async () => {
      let totalAdded = 0
      let totalSkipped = 0
      const errors: string[] = []
      await Promise.all(
        platformsToImport.map(async p => {
          const result = await addInfluencersBatch(workspaceId, byPlatform[p], p, campaignId)
          if (result.error) errors.push(result.error)
          else { totalAdded += result.added; totalSkipped += result.skipped }
        })
      )
      if (errors.length) { errors.forEach(e => toast.error(e)); return }
      if (totalAdded === 0) {
        toast.info('All handles already exist in this workspace')
      } else if (totalSkipped > 0) {
        toast.success(`Imported ${totalAdded} influencer${totalAdded !== 1 ? 's' : ''} — ${totalSkipped} already existed`)
      } else {
        toast.success(`Imported ${totalAdded} influencer${totalAdded !== 1 ? 's' : ''}`)
      }
      handleClose()
    })
  }

  function handleClose() {
    setOpen(false)
    // reset manual batch
    setManualActivePlatform('tiktok')
    setManualHandleInputs({ tiktok: '', instagram: '', youtube: '' })
    setManualStep('input')
    setIsManualValidating(false)
    setIsAdding(false)
    setManualResults([])
    setManualSelected(new Set())
    // reset csv import
    setCsvImportStep('upload')
    setCsvImportFileName('')
    setCsvImportError(null)
    setCsvImportResults([])
    setCsvImportSelected(new Set())
    if (csvFileRef.current) csvFileRef.current.value = ''
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const csvValidCount = csvImportResults.filter(r => r.status === 'valid').length
  const csvPrivateCount = csvImportResults.filter(r => r.status === 'private').length
  const csvNotFoundCount = csvImportResults.filter(r => r.status === 'not_found').length
  const csvSelectedCount = csvImportSelected.size
  const csvDeselectedCount = csvImportResults.length - csvSelectedCount

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
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
            Add influencers to your workspace.
            {campaignId && ' They will also be added to the selected campaign.'}
          </DialogDescription>
        </DialogHeader>

        {/* Tab switcher */}
        <div role="tablist" aria-label="Add mode" className="flex gap-1 rounded-lg bg-background-muted p-1 mx-6 mt-1">
          {(['manual', 'csv'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors',
                mode === m
                  ? 'bg-background-surface text-foreground shadow-xs'
                  : 'text-foreground-lighter hover:text-foreground'
              )}
            >
              {m === 'manual' ? 'Add manually' : 'Import CSV'}
            </button>
          ))}
        </div>

        {/* ── Manual tab ── */}
        {mode === 'manual' && (
          <div>
            <DialogBody className="space-y-4">
              {manualStep === 'input' && (
                <div className="space-y-4">
                  {/* Platform sub-tabs */}
                  <div className="flex gap-1 border-b border-border">
                    {PLATFORMS.map(p => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setManualActivePlatform(p.value)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 -mb-px transition-colors',
                          manualActivePlatform === p.value
                            ? 'border-brand text-foreground'
                            : 'border-transparent text-foreground-muted hover:text-foreground'
                        )}
                      >
                        <PlatformIcon platform={p.value} size={13} />
                        {p.label}
                        {parseHandles(manualHandleInputs[p.value]).length > 0 && (
                          <span className="ml-1 text-[11px] bg-brand/10 text-brand rounded-full px-1.5 py-0.5 leading-none">
                            {parseHandles(manualHandleInputs[p.value]).length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Textarea */}
                  <div className="space-y-1.5">
                    <textarea
                      value={manualHandleInputs[manualActivePlatform]}
                      onChange={e =>
                        setManualHandleInputs(prev => ({ ...prev, [manualActivePlatform]: e.target.value }))
                      }
                      placeholder={`Paste ${PLATFORMS.find(p => p.value === manualActivePlatform)?.label} handles, one per line\ne.g. @username\n\n@ symbols and extra whitespace are stripped automatically`}
                      rows={6}
                      className="w-full rounded-lg border border-border bg-background-surface px-3 py-2 text-[13px] text-foreground placeholder:text-foreground-muted resize-none focus:outline-none focus:ring-2 focus:ring-brand/50"
                    />
                  </div>
                </div>
              )}

              {manualStep === 'confirm' && (
                <div className="space-y-3">
                  {/* Warning banner */}
                  {manualResults.some(r => r.status === 'not_found' || r.status === 'private') && (
                    <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-[12px] text-warning">
                      Private accounts will still be tracked. Handles marked &quot;not found&quot; won&apos;t be added and are deselected by default.
                    </div>
                  )}

                  {/* All-not-found empty state */}
                  {manualSelected.size === 0 && manualResults.every(r => r.status === 'not_found') && (
                    <p className="text-center text-[13px] text-foreground-muted py-4">
                      No valid handles found — go back and check your input.
                    </p>
                  )}

                  {/* Results grid */}
                  <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {manualResults.map(r => {
                      const key = `${r.platform}:${r.handle}`
                      const isChecked = manualSelected.has(key)
                      return (
                        <div
                          key={key}
                          className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-background-surface transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              const next = new Set(manualSelected)
                              if (e.target.checked) next.add(key)
                              else next.delete(key)
                              setManualSelected(next)
                            }}
                            className="h-4 w-4 rounded border-border cursor-pointer flex-shrink-0"
                          />
                          {r.profile_pic_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.profile_pic_url}
                              alt={r.handle}
                              className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-background-muted border border-border flex-shrink-0" />
                          )}
                          <span className="text-[13px] font-medium text-foreground flex-1 truncate">
                            @{r.handle}
                          </span>
                          <PlatformIcon platform={r.platform} size={13} />
                          <span
                            className={cn(
                              'text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0',
                              r.status === 'valid' && 'bg-brand/10 text-brand',
                              r.status === 'private' && 'bg-warning/10 text-warning',
                              r.status === 'not_found' && 'bg-destructive/10 text-destructive'
                            )}
                          >
                            {r.status === 'not_found' ? 'Not found' : r.status === 'private' ? 'Private' : 'Valid'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="secondary" size="md" onClick={handleClose}>Cancel</Button>

              {manualStep === 'input' && (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  loading={isManualValidating}
                  disabled={(['tiktok', 'instagram', 'youtube'] as CsvPlatform[]).every(
                    p => parseHandles(manualHandleInputs[p]).length === 0
                  )}
                  onClick={handleManualValidate}
                >
                  Add Influencers
                </Button>
              )}

              {manualStep === 'confirm' && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => setManualStep('input')}
                    disabled={isAdding}
                  >
                    Back
                  </Button>
                  <div className="flex items-center gap-3">
                    <span className="text-[12px] text-foreground-muted">
                      {manualSelected.size} selected · {manualResults.length - manualSelected.size} will be skipped
                    </span>
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      loading={isAdding}
                      disabled={manualSelected.size === 0}
                      onClick={handleManualConfirm}
                    >
                      Confirm
                    </Button>
                  </div>
                </>
              )}
            </DialogFooter>
          </div>
        )}

        {/* ── CSV Import tab ── */}
        {mode === 'csv' && (
          <div>
            <DialogBody className="space-y-4">

              {/* Step: upload */}
              {csvImportStep === 'upload' && (
                <>
                  {/* Download template card */}
                  <button
                    type="button"
                    onClick={() => downloadTemplate(['tiktok', 'instagram', 'youtube'])}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-brand/20 bg-brand/5 px-4 py-3 text-left transition-colors hover:bg-brand/10"
                  >
                    <div>
                      <p className="text-[13px] font-medium text-foreground">Download template</p>
                      <p className="text-[11px] text-foreground-muted mt-0.5">
                        CSV with tiktok_handle, ig_handle, youtube_handle columns
                      </p>
                    </div>
                    <DownloadSimple size={16} className="flex-shrink-0 text-brand" />
                  </button>

                  {/* Upload zone */}
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-8 text-center transition-colors hover:border-brand/40 hover:bg-brand/5">
                    <UploadSimple size={20} className="text-foreground-muted" />
                    <div>
                      <span className="text-[13px] font-medium text-foreground">Drop your CSV here</span>
                      <span className="text-[13px] text-foreground-muted">, or </span>
                      <span className="text-[13px] font-medium text-brand">browse</span>
                    </div>
                    <span className="text-[11px] text-foreground-muted">.csv or .txt · max 500 rows</span>
                    <input
                      ref={csvFileRef}
                      type="file"
                      accept=".csv,.txt"
                      className="hidden"
                      onChange={handleCsvFileSelect}
                    />
                  </label>

                  {/* Parse error */}
                  {csvImportError && (
                    <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                      <XCircle size={13} className="mt-0.5 flex-shrink-0 text-destructive" />
                      <div>
                        <p className="text-[12px] text-destructive">{csvImportError}</p>
                        <button
                          type="button"
                          onClick={() => { setCsvImportError(null); csvFileRef.current?.click() }}
                          className="mt-0.5 text-[11px] text-foreground-muted underline"
                        >
                          Try a different file
                        </button>
                      </div>
                    </div>
                  )}

                  <p className="text-center text-[11px] text-foreground-subtle">
                    Leave cells blank for platforms you don&apos;t track. @ symbols are optional.
                  </p>
                </>
              )}

              {/* Step: validating */}
              {csvImportStep === 'validating' && (
                <div className="flex flex-col items-center justify-center gap-3 py-8">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-foreground-lighter" />
                    <span className="text-[13px] font-medium text-foreground">{csvImportFileName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-foreground-muted">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span className="text-[13px]">Verifying handles…</span>
                  </div>
                </div>
              )}

              {/* Step: review */}
              {csvImportStep === 'review' && (
                <>
                  {/* Summary pills */}
                  <div className="flex flex-wrap gap-2">
                    {csvValidCount > 0 && (
                      <span className="flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-[11px] font-medium text-brand">
                        <CheckCircle size={11} />
                        {csvValidCount} valid
                      </span>
                    )}
                    {csvPrivateCount > 0 && (
                      <span className="flex items-center gap-1.5 rounded-full border border-warning/20 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning">
                        ⚠ {csvPrivateCount} private
                      </span>
                    )}
                    {csvNotFoundCount > 0 && (
                      <span className="flex items-center gap-1.5 rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive">
                        <XCircle size={11} />
                        {csvNotFoundCount} not found
                      </span>
                    )}
                  </div>

                  {/* All not-found empty state */}
                  {csvValidCount === 0 && csvPrivateCount === 0 && csvImportResults.length > 0 && (
                    <p className="text-center text-[12px] text-foreground-muted">
                      No importable handles found. Check for typos in your file.
                    </p>
                  )}

                  {/* Results list */}
                  {csvImportResults.length > 0 && (
                    <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                      {csvImportResults.map(r => {
                        const key = `${r.platform}:${r.handle}`
                        const isChecked = csvImportSelected.has(key)
                        const isNotFound = r.status === 'not_found'
                        return (
                          <div
                            key={key}
                            role={isNotFound ? undefined : 'button'}
                            tabIndex={isNotFound ? undefined : 0}
                            onClick={() => toggleCsvImportHandle(key)}
                            onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') toggleCsvImportHandle(key) }}
                            className={cn(
                              'flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors',
                              isNotFound
                                ? 'cursor-default opacity-50'
                                : 'cursor-pointer hover:bg-background-surface'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleCsvImportHandle(key)}
                              disabled={isNotFound}
                              onClick={e => e.stopPropagation()}
                              className="h-4 w-4 flex-shrink-0 cursor-pointer rounded border-border"
                            />
                            {r.profile_pic_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={r.profile_pic_url}
                                alt={r.handle}
                                className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 flex-shrink-0 rounded-full border border-border bg-background-muted" />
                            )}
                            <span className="flex-1 truncate text-[13px] font-medium text-foreground">
                              @{r.handle}
                            </span>
                            <PlatformIcon platform={r.platform} size={13} />
                            <span
                              className={cn(
                                'flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                                r.status === 'valid' && 'bg-brand/10 text-brand',
                                r.status === 'private' && 'bg-warning/10 text-warning',
                                r.status === 'not_found' && 'bg-destructive/10 text-destructive'
                              )}
                            >
                              {r.status === 'not_found' ? 'Not found' : r.status === 'private' ? 'Private' : 'Valid'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Private accounts note */}
                  {csvPrivateCount > 0 && (
                    <p className="text-[11px] text-foreground-muted">
                      Private accounts will still be tracked. Handles marked &quot;not found&quot; are deselected by default.
                    </p>
                  )}

                  {/* Upload different file */}
                  <button
                    type="button"
                    onClick={() => {
                      setCsvImportStep('upload')
                      setCsvImportFileName('')
                      setCsvImportResults([])
                      setCsvImportSelected(new Set())
                      setCsvImportError(null)
                    }}
                    className="text-[11px] text-foreground-muted underline"
                  >
                    Upload a different file
                  </button>
                </>
              )}

            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="secondary" size="md" onClick={handleClose}>Cancel</Button>

              {csvImportStep === 'review' && (
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-[12px] text-foreground-muted">
                    {csvSelectedCount} selected{csvDeselectedCount > 0 ? ` · ${csvDeselectedCount} skipped` : ''}
                  </span>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    disabled={csvSelectedCount === 0 || isCsvImporting}
                    loading={isCsvImporting}
                    onClick={handleCsvImport}
                  >
                    Import {csvSelectedCount > 0 ? csvSelectedCount : ''} influencer{csvSelectedCount !== 1 ? 's' : ''}
                  </Button>
                </div>
              )}
            </DialogFooter>
          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}
