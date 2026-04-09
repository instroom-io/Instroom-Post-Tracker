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
import { listSharedDrives, listSharedDriveFolders } from '@/lib/actions/account'
import { setAgencyDriveFolder } from '@/lib/actions/agencies'
import { HardDrive, Folder, CaretRight, ArrowClockwise } from '@phosphor-icons/react'
import type { DriveFolder, SharedDrive } from '@/lib/actions/account'

interface AgencyFolderPickerDialogProps {
  agencyId: string
  agencyName: string
  currentFolderId: string | null
  defaultOpen?: boolean
  onClose: () => void
  onFolderSelected?: (folderId: string) => void
}

type ViewMode = 'drives' | 'folders'

export function AgencyFolderPickerDialog({
  agencyId,
  agencyName,
  currentFolderId,
  defaultOpen = false,
  onClose,
  onFolderSelected,
}: AgencyFolderPickerDialogProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [viewMode, setViewMode] = useState<ViewMode>('drives')
  const [drives, setDrives] = useState<SharedDrive[]>([])
  const [folders, setFolders] = useState<DriveFolder[]>([])
  const [activeDrive, setActiveDrive] = useState<SharedDrive | null>(null)
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<string | null>(currentFolderId)
  const [isPending, startTransition] = useTransition()

  async function loadDrives() {
    setLoading(true)
    const result = await listSharedDrives()
    setLoading(false)
    if ('error' in result) {
      toast.error('Failed to load Shared Drives.')
      return
    }
    setDrives(result.drives)
  }

  async function loadFolders(driveId: string, parentId?: string) {
    setLoading(true)
    const result = await listSharedDriveFolders(driveId, parentId)
    setLoading(false)
    if ('error' in result) {
      toast.error('Failed to load folders.')
      return
    }
    setFolders(result.folders)
  }

  useEffect(() => {
    if (open) {
      setViewMode('drives')
      setActiveDrive(null)
      setBreadcrumb([])
      loadDrives()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleSelectDrive(drive: SharedDrive) {
    setActiveDrive(drive)
    setSelected(drive.id)
    setBreadcrumb([])
    setViewMode('folders')
    loadFolders(drive.id)
  }

  function handleOpenFolder(folder: DriveFolder) {
    setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }])
    loadFolders(activeDrive!.id, folder.id)
  }

  function handleBreadcrumbClick(index: number) {
    if (index === -1) {
      setViewMode('drives')
      setActiveDrive(null)
      setBreadcrumb([])
      return
    }
    const newBreadcrumb = breadcrumb.slice(0, index)
    setBreadcrumb(newBreadcrumb)
    const parentId = newBreadcrumb.at(-1)?.id
    loadFolders(activeDrive!.id, parentId)
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await setAgencyDriveFolder(agencyId, selected)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success('Storage folder updated.')
      if (selected) onFolderSelected?.(selected)
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
          <DialogTitle>Choose Shared Drive — {agencyName}</DialogTitle>
        </DialogHeader>
        <div className="px-5 py-4 space-y-3">
          {/* Breadcrumb */}
          <div className="flex flex-wrap items-center gap-1 text-[11px] text-foreground-muted min-h-[18px]">
            <button
              className="hover:text-foreground transition-colors"
              onClick={() => handleBreadcrumbClick(-1)}
            >
              Shared Drives
            </button>
            {activeDrive && (
              <span className="flex items-center gap-1">
                <CaretRight size={10} />
                <button
                  className="hover:text-foreground transition-colors"
                  onClick={() => handleBreadcrumbClick(0)}
                >
                  {activeDrive.name}
                </button>
              </span>
            )}
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

          {/* List */}
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <ArrowClockwise size={16} className="animate-spin text-foreground-muted" />
              </div>
            ) : viewMode === 'drives' ? (
              drives.length === 0 ? (
                <p className="px-3 py-6 text-center text-[11px] text-foreground-muted">
                  No Shared Drives found. Go to drive.google.com → Shared drives → New to create one.
                </p>
              ) : (
                drives.map((drive) => (
                  <div
                    key={drive.id}
                    className={`flex items-center justify-between transition-colors hover:bg-background-muted ${
                      selected === drive.id ? 'bg-brand/10' : ''
                    }`}
                  >
                    <button
                      className={`flex flex-1 items-center gap-2 px-3 py-2.5 text-left text-[12px] ${
                        selected === drive.id ? 'text-brand font-medium' : 'text-foreground'
                      }`}
                      onClick={() => setSelected(drive.id)}
                    >
                      <HardDrive size={13} className="flex-shrink-0 text-foreground-muted" />
                      {drive.name}
                    </button>
                    <button
                      className="mr-2 rounded p-1.5 text-foreground-muted hover:bg-background-muted hover:text-foreground transition-colors"
                      title="Browse folders"
                      onClick={() => handleSelectDrive(drive)}
                    >
                      <CaretRight size={12} />
                    </button>
                  </div>
                ))
              )
            ) : (
              <>
                {/* Drive root option */}
                <button
                  className={`flex w-full items-center gap-2 border-b border-border/50 px-3 py-2.5 text-left text-[12px] transition-colors hover:bg-background-muted ${
                    selected === activeDrive?.id ? 'bg-brand/10 text-brand font-medium' : 'text-foreground'
                  }`}
                  onClick={() => setSelected(activeDrive?.id ?? null)}
                >
                  {activeDrive?.name} root
                </button>
                {folders.length === 0 ? (
                  <p className="px-3 py-6 text-center text-[11px] text-foreground-muted">
                    No subfolders
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
              </>
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
              disabled={!selected}
            >
              Confirm
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
