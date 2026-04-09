'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Copy, Check } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateWorkspaceStorageFolder } from '@/lib/actions/workspace'

const SERVICE_ACCOUNT_EMAIL = process.env.NEXT_PUBLIC_GOOGLE_SERVICE_ACCOUNT_EMAIL ?? ''

interface StorageCardProps {
  workspaceId: string
  currentFolderId: string | null
  canEdit: boolean
}

export function StorageCard({ workspaceId, currentFolderId, canEdit }: StorageCardProps) {
  const [value, setValue] = useState(currentFolderId ?? '')
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleCopy() {
    if (!SERVICE_ACCOUNT_EMAIL) return
    navigator.clipboard.writeText(SERVICE_ACCOUNT_EMAIL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateWorkspaceStorageFolder(workspaceId, value.trim() || null)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Storage folder updated.')
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-background-surface shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-display text-[15px] font-bold text-foreground">Storage</h2>
        <p className="mt-0.5 text-[12px] text-foreground-lighter">
          Google Drive folder where posts are automatically downloaded for this workspace.
        </p>
      </div>
      <div className="p-5 space-y-5">

        {/* Setup steps */}
        <div className="space-y-3">
          <p className="text-[12px] font-medium text-foreground">Setup</p>
          <ol className="space-y-2.5 text-[12px] text-foreground-lighter list-none">
            <li className="flex gap-2.5">
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-background-muted text-foreground-muted flex items-center justify-center text-[10px] font-bold mt-0.5">1</span>
              <span>Create a <strong className="text-foreground font-medium">Google Shared Drive</strong> (or designate an existing one) for this workspace&apos;s posts. Personal Google Drive folders are not supported — a Shared Drive is required.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-background-muted text-foreground-muted flex items-center justify-center text-[10px] font-bold mt-0.5">2</span>
              <div className="space-y-1.5 min-w-0 flex-1">
                <span>Add the Instroom service account as a member of that Shared Drive — grant <strong className="text-foreground font-medium">Content Manager</strong> access:</span>
                {SERVICE_ACCOUNT_EMAIL ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                    <code className="flex-1 text-[11px] text-foreground truncate select-all">{SERVICE_ACCOUNT_EMAIL}</code>
                    <button
                      onClick={handleCopy}
                      className="flex-shrink-0 text-foreground-muted hover:text-foreground transition-colors"
                      aria-label="Copy service account email"
                    >
                      {copied ? <Check size={13} className="text-brand" /> : <Copy size={13} />}
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-foreground-muted italic">Service account email not configured — contact your platform admin.</p>
                )}
              </div>
            </li>
            <li className="flex gap-2.5">
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-background-muted text-foreground-muted flex items-center justify-center text-[10px] font-bold mt-0.5">3</span>
              <span>Paste the folder URL or ID below and save.</span>
            </li>
          </ol>
        </div>

        {/* Folder input */}
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-foreground">
            Drive Folder URL or ID
          </label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/…"
            disabled={!canEdit || isPending}
          />
          {currentFolderId && (
            <p className="text-[11px] text-foreground-muted">
              Current: <code className="text-foreground-lighter">{currentFolderId}</code>
            </p>
          )}
        </div>

        {canEdit && (
          <Button variant="primary" size="sm" onClick={handleSave} loading={isPending}>
            Save
          </Button>
        )}
      </div>
    </div>
  )
}
