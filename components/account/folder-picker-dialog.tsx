'use client'

import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { listUserDriveFolders, setWorkspaceDriveFolder } from '@/lib/actions/account'
import { Folder, CaretRight, ArrowClockwise } from '@phosphor-icons/react'
import type { DriveFolder } from '@/lib/actions/account'

interface FolderPickerDialogProps {
  workspaceId: string
  workspaceName: string
  currentFolderId: string | null
  defaultOpen?: boolean
  onClose: () => void
}

export function FolderPickerDialog({
  workspaceId,
  workspaceName,
  currentFolderId,
  defaultOpen = false,
  onClose,
}: FolderPickerDialogProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [folders, setFolders] = useState<DriveFolder[]>([])
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(currentFolderId)
  const [isPending, startTransition] = useTransition()

  async function loadFolders(parentId?: string) {
    setLoading(true)
    const result = await listUserDriveFolders(parentId)
    setLoading(false)
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    setFolders(result.folders)
  }

  useEffect(() => {
    if (open) {
      setBreadcrumb([])
      loadFolders(undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleOpenFolder(folder: DriveFolder) {
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }])
    loadFolders(folder.id)
  }

  function handleBreadcrumbClick(index: number) {
    const newBreadcrumb = breadcrumb.slice(0, index)
    setBreadcrumb(newBreadcrumb)
    loadFolders(newBreadcrumb.at(-1)?.id)
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await setWorkspaceDriveFolder(workspaceId, selected)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Save destination updated.')
      setOpen(false)
      onClose()
    })
  }

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose folder — {workspaceName}</DialogTitle>
        </DialogHeader>
        <div className="px-5 py-4 space-y-3">
          {/* Breadcrumb */}
          <div className="flex flex-wrap items-center gap-1 text-[11px] text-foreground-muted min-h-[18px]">
            <button
              className="hover:text-foreground transition-colors"
              onClick={() => handleBreadcrumbClick(0)}
            >
              My Drive
            </button>
            {breadcrumb.map((crumb, i) => (
              <span key={crumb.id} className="flex items-center gap-1">
                <CaretRight size={10} />
                <button
                  className="hover:text-foreground transition-colors"
                  onClick={() => handleBreadcrumbClick(i + 1)}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>

          {/* Folder list */}
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            {/* Root (My Drive) option */}
            <button
              className={`flex w-full items-center gap-2 border-b border-border/50 px-3 py-2.5 text-left text-[12px] transition-colors hover:bg-background-muted ${
                selected === null ? 'bg-brand/10 text-brand font-medium' : 'text-foreground'
              }`}
              onClick={() => setSelected(null)}
            >
              My Drive root
            </button>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <ArrowClockwise size={16} className="animate-spin text-foreground-muted" />
              </div>
            ) : folders.length === 0 ? (
              <p className="px-3 py-6 text-center text-[11px] text-foreground-muted">
                No folders found
              </p>
            ) : (
              folders.map((folder) => (
                <div
                  key={folder.id}
                  className={`flex items-center justify-between transition-colors hover:bg-background-muted ${
                    selected === folder.id ? 'bg-brand/10' : ''
                  }`}
                >
                  <button
                    className={`flex flex-1 items-center gap-2 px-3 py-2.5 text-left text-[12px] ${
                      selected === folder.id ? 'text-brand font-medium' : 'text-foreground'
                    }`}
                    onClick={() => setSelected(folder.id)}
                  >
                    <Folder size={13} className="flex-shrink-0 text-foreground-muted" />
                    {folder.name}
                  </button>
                  <button
                    className="mr-2 rounded p-1.5 text-foreground-muted hover:bg-background-muted hover:text-foreground transition-colors"
                    title="Open folder"
                    onClick={() => handleOpenFolder(folder)}
                  >
                    <CaretRight size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirm}
              loading={isPending}
            >
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
