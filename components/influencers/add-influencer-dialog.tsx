'use client'

import { useState, useTransition, useRef } from 'react'
import { Plus, UploadSimple, CheckCircle, XCircle, Lock, FileText } from '@phosphor-icons/react'
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
  campaignId?: string   // existing: hardcoded campaign (campaign detail page)
  trigger?: React.ReactNode
}

type Mode = 'manual' | 'csv'
type CsvPlatform = 'instagram' | 'tiktok' | 'youtube'
type CsvStep = 'idle' | 'parsed' | 'validating' | 'validated'

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

  // ── CSV tab state ─────────────────────────────────────────────────────────
  const [csvPlatform, setCsvPlatform] = useState<CsvPlatform>('tiktok')
  const [parsedHandles, setParsedHandles] = useState<string[]>([])
  const [csvFileName, setCsvFileName] = useState<string>('')
  const [csvStep, setCsvStep] = useState<CsvStep>('idle')
  const [csvError, setCsvError] = useState<string | null>(null)
  const [validationResults, setValidationResults] = useState<HandleValidationResult[]>([])
  const [isValidating, startValidateTransition] = useTransition()
  const [isImporting, startImportTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // ── CSV handlers ──────────────────────────────────────────────────────────
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvFileName(file.name)
    setCsvError(null)
    setValidationResults([])

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const handles = text
        .split(/[\r\n,]+/)
        .map((h) => h.trim().replace(/^@/, ''))
        .filter((h) => h.length > 0 && h.length <= 100)

      if (handles.length === 0) {
        setCsvError('No valid handles found in file.')
        setCsvStep('idle')
        return
      }
      setParsedHandles(handles)
      setCsvStep('parsed')
    }
    reader.readAsText(file)
  }

  function handleValidate() {
    setCsvError(null)
    setCsvStep('validating')
    startValidateTransition(async () => {
      const results = await validateInfluencerHandles(workspaceId, csvPlatform, parsedHandles)
      setValidationResults(results)
      setCsvStep('validated')
    })
  }

  function handleImport() {
    const validHandles = validationResults.filter((r) => r.status === 'valid').map((r) => r.handle)
    if (validHandles.length === 0) return

    startImportTransition(async () => {
      const result = await addInfluencersBatch(workspaceId, validHandles, csvPlatform, campaignId)
      if (result?.error) { setCsvError(result.error); return }

      const { added, skipped } = result
      if (added === 0) {
        toast.info('All handles already exist in this workspace')
      } else if (skipped > 0) {
        toast.success(`Imported ${added} influencer(s) — ${skipped} already existed`)
      } else {
        toast.success(`Imported ${added} influencer(s)`)
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
    // reset csv
    setCsvPlatform('tiktok')
    setParsedHandles([])
    setCsvFileName('')
    setCsvStep('idle')
    setCsvError(null)
    setValidationResults([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const validCount = validationResults.filter((r) => r.status === 'valid').length
  const privateCount = validationResults.filter((r) => r.status === 'private').length
  const notFoundCount = validationResults.filter((r) => r.status === 'not_found').length

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
                      placeholder={`Paste ${PLATFORMS.find(p => p.value === manualActivePlatform)?.label} handles, one per line\ne.g. @username`}
                      rows={6}
                      className="w-full rounded-lg border border-border bg-background-surface px-3 py-2 text-[13px] text-foreground placeholder:text-foreground-muted resize-none focus:outline-none focus:ring-2 focus:ring-brand/50"
                    />
                    <p className="text-[11px] text-foreground-muted">
                      @ symbols and extra whitespace are stripped automatically
                    </p>
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

        {/* ── CSV tab ── */}
        {mode === 'csv' && (
          <div>
            <DialogBody className="space-y-4">

              {/* Platform selector */}
              <div>
                <p className="mb-2 text-[11px] font-medium text-foreground-light">Platform</p>
                <div className="flex gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      aria-label={p.label}
                      aria-pressed={csvPlatform === p.value}
                      onClick={() => {
                        setCsvPlatform(p.value)
                        // reset validation if platform changes after parse
                        if (csvStep === 'validated') { setCsvStep('parsed'); setValidationResults([]) }
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-lg border px-3 py-1.5 transition-colors',
                        csvPlatform === p.value
                          ? 'border-brand/40 bg-brand/10'
                          : 'border-border bg-background-surface hover:bg-background-muted'
                      )}
                    >
                      <PlatformIcon platform={p.value} size={16} />
                      <span className="text-[10px] font-medium text-foreground-muted">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* File upload zone */}
              <div>
                <p className="mb-2 text-[11px] font-medium text-foreground-light">CSV file</p>
                <label
                  className={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors',
                    csvFileName
                      ? 'border-border bg-background-muted'
                      : 'border-border hover:border-brand/40 hover:bg-brand/5'
                  )}
                >
                  {csvFileName ? (
                    <>
                      <FileText size={18} className="text-foreground-lighter" />
                      <span className="text-[12px] font-medium text-foreground">{csvFileName}</span>
                      <span className="text-[11px] text-foreground-lighter">{parsedHandles.length} handle{parsedHandles.length !== 1 ? 's' : ''} found</span>
                    </>
                  ) : (
                    <>
                      <UploadSimple size={18} className="text-foreground-muted" />
                      <span className="text-[12px] text-foreground-light">Click to upload a CSV or TXT file</span>
                      <span className="text-[11px] text-foreground-muted">One handle per row · @ symbol optional</span>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>

              {/* Validation results */}
              {csvStep === 'validated' && validationResults.length > 0 && (
                <div className="rounded-xl border border-border bg-background-muted p-3 space-y-1.5">
                  <p className="text-[11px] font-semibold text-foreground-light uppercase tracking-wide mb-2">Validation results</p>
                  {validCount > 0 && (
                    <div className="flex items-center gap-2">
                      <CheckCircle size={13} className="text-brand flex-shrink-0" />
                      <span className="text-[12px] text-foreground">{validCount} valid — will be imported</span>
                    </div>
                  )}
                  {privateCount > 0 && (
                    <div className="flex items-center gap-2">
                      <Lock size={13} className="text-warning flex-shrink-0" />
                      <span className="text-[12px] text-foreground-lighter">{privateCount} private — account exists, posts hidden</span>
                    </div>
                  )}
                  {notFoundCount > 0 && (
                    <div className="flex items-center gap-2">
                      <XCircle size={13} className="text-destructive flex-shrink-0" />
                      <span className="text-[12px] text-foreground-lighter">{notFoundCount} not found — username doesn&apos;t exist</span>
                    </div>
                  )}
                </div>
              )}

              {csvError && <p className="text-[11px] text-destructive">{csvError}</p>}

            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="secondary" size="md" onClick={handleClose}>Cancel</Button>

              {csvStep === 'parsed' && (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  loading={isValidating}
                  onClick={handleValidate}
                >
                  Verify {parsedHandles.length} handle{parsedHandles.length !== 1 ? 's' : ''}
                </Button>
              )}

              {csvStep === 'validated' && validCount > 0 && (
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  loading={isImporting}
                  onClick={handleImport}
                >
                  Import {validCount} influencer{validCount !== 1 ? 's' : ''}
                </Button>
              )}

              {csvStep === 'validated' && validCount === 0 && (
                <Button type="button" variant="secondary" size="md" disabled>
                  No valid handles
                </Button>
              )}
            </DialogFooter>
          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}
