'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateWorkspaceStorageFolder } from '@/lib/actions/workspace'

interface StorageCardProps {
  workspaceId: string
  currentFolderId: string | null
  canEdit: boolean
}

export function StorageCard({ workspaceId, currentFolderId, canEdit }: StorageCardProps) {
  const [value, setValue] = useState(currentFolderId ?? '')
  const [isPending, startTransition] = useTransition()

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
          Google Drive folder where all posts are automatically downloaded.
        </p>
      </div>
      <div className="p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-foreground">
            Drive Folder ID or URL
          </label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste Google Drive folder URL or ID"
            disabled={!canEdit || isPending}
          />
          <p className="text-[11px] text-foreground-muted">
            Share your Drive folder with the Instroom service account (found in your
            agency settings) with Editor access, then paste the folder link here.
          </p>
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
