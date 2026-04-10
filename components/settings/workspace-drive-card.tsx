'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FolderPickerDialog } from '@/components/account/folder-picker-dialog'
import { CheckCircle, Cloud } from '@phosphor-icons/react'

interface WorkspaceDriveCardProps {
  workspaceId: string
  workspaceName: string
  connectedEmail: string | null
  currentFolderId: string | null
}

export function WorkspaceDriveCard({
  workspaceId,
  workspaceName,
  connectedEmail,
  currentFolderId,
}: WorkspaceDriveCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <>
      <div className="rounded-xl border border-border bg-background-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-[15px] font-bold text-foreground">Personal Drive</h2>
          <p className="mt-0.5 text-[12px] text-foreground-lighter">
            Choose where your &quot;Save to Drive&quot; posts are saved for this workspace.
          </p>
        </div>
        <div className="p-5">
          {connectedEmail ? (
            <div className="flex flex-wrap items-center justify-between gap-y-2 rounded-lg border border-border px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <CheckCircle size={16} className="text-brand flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-foreground truncate">{workspaceName}</p>
                  <p className="text-[11px] text-foreground-muted truncate">
                    {currentFolderId ? `Folder ID: ${currentFolderId}` : 'My Drive root'}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="flex-shrink-0" onClick={() => setPickerOpen(true)}>
                Change folder
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Cloud size={20} className="flex-shrink-0 text-foreground-muted" />
              <p className="text-[12px] text-foreground-muted">
                Connect your Google Drive in{' '}
                <Link href="/account/settings" className="text-brand hover:underline">
                  Account Settings
                </Link>{' '}
                to enable personal Drive saves for this workspace.
              </p>
            </div>
          )}
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
