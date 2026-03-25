'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { setMemberDriveFolder } from '@/lib/actions/workspace'

interface SetMemberDriveFolderDialogProps {
  workspaceId: string
  memberId: string
  memberName: string
  currentFolderId: string | null
  defaultOpen?: boolean
  onClose?: () => void
}

export function SetMemberDriveFolderDialog({
  workspaceId,
  memberId,
  memberName,
  currentFolderId,
  defaultOpen = false,
  onClose,
}: SetMemberDriveFolderDialogProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [folderId, setFolderId] = useState(currentFolderId ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) onClose?.()
  }

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await setMemberDriveFolder(workspaceId, memberId, folderId || null)
      if (result?.error) {
        setError(result.error)
        return
      }
      toast.success('Drive folder saved.')
      handleOpenChange(false)
    })
  }

  function handleRemove() {
    setError(null)
    startTransition(async () => {
      const result = await setMemberDriveFolder(workspaceId, memberId, null)
      if (result?.error) {
        setError(result.error)
        return
      }
      toast.success('Drive folder removed.')
      setFolderId('')
      handleOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Set personal Drive folder</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <p className="text-[12px] text-foreground-lighter">
              Personal Drive folder for{' '}
              <span className="font-medium text-foreground">{memberName}</span>. Used as a
              fallback when the workspace has no Drive folder configured.
            </p>
            <Input
              label="Google Drive folder"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              disabled={isPending}
            />
            <div className="text-[11px] text-foreground-muted space-y-1 leading-relaxed">
              <p>To set up:</p>
              <ol className="list-decimal list-inside space-y-0.5 pl-1">
                <li>Create a folder in Google Drive</li>
                <li>
                  Share it with{' '}
                  <span className="font-mono text-foreground select-all">
                    drive-uploader@instroom-post-tracker-drive.iam.gserviceaccount.com
                  </span>{' '}
                  as <strong>Editor</strong>
                </li>
                <li>Paste the folder URL or ID above</li>
              </ol>
            </div>
            {error && <p className="text-[11px] text-destructive">{error}</p>}
          </div>
        </DialogBody>
        <DialogFooter>
          {currentFolderId && (
            <Button
              variant="ghost"
              size="md"
              onClick={handleRemove}
              disabled={isPending}
              className="mr-auto text-destructive hover:text-destructive"
            >
              Remove
            </Button>
          )}
          <Button
            variant="ghost"
            size="md"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button variant="primary" size="md" loading={isPending} onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
