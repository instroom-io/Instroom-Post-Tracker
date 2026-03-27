'use client'

import { useState, useTransition, useRef } from 'react'
import { Plus, Upload, CheckCircle2, XCircle, Lock, FileText } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  addInfluencer,
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
type CsvStep = 'idle' | 'parsed' | 'validating' | 'validated'

const PLATFORMS: { value: CsvPlatform; label: string }[] = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
]

export function AddInfluencerDialog({
  workspaceId,
  campaignId,
  trigger,
}: AddInfluencerDialogProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('manual')

  // ── Manual tab state ──────────────────────────────────────────────────────
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ ig_handle: '', tiktok_handle: '', youtube_handle: '' })

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
  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await addInfluencer(workspaceId, form, campaignId)
      if (result?.error) { setError(result.error); return }
      toast.success('Influencer added')
      handleClose()
    })
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
    // reset manual
    setForm({ ig_handle: '', tiktok_handle: '', youtube_handle: '' })
    setError(null)
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
            {campaignId && ' They will also be added to this campaign.'}
          </DialogDescription>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-1 rounded-lg bg-background-muted p-1 mx-6 mt-1">
          {(['manual', 'csv'] as const).map((m) => (
            <button
              key={m}
              type="button"
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
          <form onSubmit={handleManualSubmit}>
            <DialogBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Instagram handle"
                  value={form.ig_handle}
                  onChange={(e) => handleChange('ig_handle', e.target.value.replace(/^@/, ''))}
                  placeholder="janesmithig"
                  hint="Without @"
                />
                <Input
                  label="TikTok handle"
                  value={form.tiktok_handle}
                  onChange={(e) => handleChange('tiktok_handle', e.target.value.replace(/^@/, ''))}
                  placeholder="janesmithtt"
                  hint="Without @"
                />
              </div>
              <Input
                label="YouTube handle"
                value={form.youtube_handle}
                onChange={(e) => handleChange('youtube_handle', e.target.value.replace(/^@/, ''))}
                placeholder="janesmith"
                hint="Without @"
              />
              {error && <p className="text-[11px] text-destructive">{error}</p>}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" size="md" onClick={handleClose}>Cancel</Button>
              <Button type="submit" variant="primary" size="md" loading={isPending}>Add influencer</Button>
            </DialogFooter>
          </form>
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
                      onClick={() => {
                        setCsvPlatform(p.value)
                        // reset validation if platform changes after parse
                        if (csvStep === 'validated') { setCsvStep('parsed'); setValidationResults([]) }
                      }}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 transition-colors',
                        csvPlatform === p.value
                          ? 'border-brand/40 bg-brand/10'
                          : 'border-border bg-background-surface hover:bg-background-muted'
                      )}
                    >
                      <PlatformIcon platform={p.value} size={16} />
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
                      <Upload size={18} className="text-foreground-muted" />
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
                      <CheckCircle2 size={13} className="text-brand flex-shrink-0" />
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
                  Validate {parsedHandles.length} handle{parsedHandles.length !== 1 ? 's' : ''}
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
