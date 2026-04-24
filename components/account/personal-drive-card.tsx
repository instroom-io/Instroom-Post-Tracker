'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FolderPickerDialog } from '@/components/account/folder-picker-dialog'
import { CheckCircle } from '@phosphor-icons/react'

interface PersonalDriveCardProps {
  currentFolderId: string | null
}

export function PersonalDriveCard({ currentFolderId }: PersonalDriveCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <>
      <div className="rounded-xl border border-border bg-background-surface p-5 shadow-sm">
        <h2 className="text-[13px] font-semibold text-foreground mb-1">Personal Drive Folder</h2>
        <p className="text-[12px] text-foreground-lighter mb-4">
          Where your &quot;Save to Drive&quot; posts are saved across all workspaces.
        </p>
        <div className="flex flex-wrap items-center justify-between gap-y-2 rounded-lg border border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <CheckCircle size={16} className="text-brand flex-shrink-0" />
            <p className="text-[12px] text-foreground-muted font-mono truncate">
              {currentFolderId ?? 'My Drive root'}
            </p>
          </div>
          <Button variant="outline" size="sm" className="flex-shrink-0" onClick={() => setPickerOpen(true)}>
            {currentFolderId ? 'Change folder' : 'Choose folder'}
          </Button>
        </div>
      </div>

      {pickerOpen && (
        <FolderPickerDialog
          currentFolderId={currentFolderId}
          defaultOpen
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  )
}
