'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FolderPickerDialog } from './folder-picker-dialog'
import { disconnectGoogleDrive } from '@/lib/actions/account'
import { CheckCircle } from '@phosphor-icons/react'

interface WorkspaceFolder {
  workspaceId: string
  workspaceName: string
  currentFolderId: string | null
}

interface GoogleDriveCardProps {
  connectedEmail: string | null
  workspaceFolders: WorkspaceFolder[]
}

export function GoogleDriveCard({ connectedEmail, workspaceFolders }: GoogleDriveCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [pickerWorkspace, setPickerWorkspace] = useState<WorkspaceFolder | null>(null)

  function handleDisconnect() {
    startTransition(async () => {
      const result = await disconnectGoogleDrive()
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Google Drive disconnected.')
        router.refresh()
      }
    })
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-background-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-[15px] font-bold text-foreground">Google Drive</h2>
          <p className="mt-0.5 text-[12px] text-foreground-lighter">
            Connect your personal Google Drive to save posts with one click.
          </p>
        </div>
        <div className="p-5 space-y-4">
          {connectedEmail ? (
            <>
              {/* Connection status */}
              <div className="flex items-center justify-between rounded-lg border border-border bg-background-muted/40 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle size={16} className="text-brand flex-shrink-0" />
                  <div>
                    <p className="text-[12px] font-medium text-foreground">Connected</p>
                    <p className="text-[11px] text-foreground-muted">{connectedEmail}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  loading={isPending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Disconnect
                </Button>
              </div>

              {/* Per-workspace folder selections */}
              {workspaceFolders.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                    Save destinations
                  </p>
                  {workspaceFolders.map((ws) => (
                    <div
                      key={ws.workspaceId}
                      className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                    >
                      <div>
                        <p className="text-[12px] font-medium text-foreground">
                          {ws.workspaceName}
                        </p>
                        <p className="text-[11px] text-foreground-muted">
                          {ws.currentFolderId
                            ? `Folder ID: ${ws.currentFolderId}`
                            : 'My Drive root'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPickerWorkspace(ws)}
                      >
                        Change folder
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center gap-4">
              <a href="/api/auth/google-drive">
                <Button variant="outline" size="sm">
                  Connect Google Drive
                </Button>
              </a>
              <p className="text-[11px] text-foreground-muted">
                Connect once to save posts to your personal Drive across all workspaces.
              </p>
            </div>
          )}
        </div>
      </div>

      {pickerWorkspace && (
        <FolderPickerDialog
          key={pickerWorkspace.workspaceId}
          workspaceId={pickerWorkspace.workspaceId}
          workspaceName={pickerWorkspace.workspaceName}
          currentFolderId={pickerWorkspace.currentFolderId}
          defaultOpen
          onClose={() => setPickerWorkspace(null)}
        />
      )}
    </>
  )
}
