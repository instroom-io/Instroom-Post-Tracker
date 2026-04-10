'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AgencyFolderPickerDialog } from '@/components/agency/agency-folder-picker-dialog'
import { disconnectAgencyGoogleAccount } from '@/lib/actions/agencies'
import { CheckCircle, HardDrive } from '@phosphor-icons/react'

interface AgencyDriveCardProps {
  agencyId: string
  agencyName: string
  agencySlug: string
  connectedEmail: string | null
  currentFolderId: string | null
}

export function AgencyDriveCard({
  agencyId,
  agencyName,
  agencySlug,
  connectedEmail,
  currentFolderId,
}: AgencyDriveCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [folderId, setFolderId] = useState(currentFolderId)
  const [isPending, startTransition] = useTransition()

  function handleDisconnect() {
    startTransition(async () => {
      const result = await disconnectAgencyGoogleAccount(agencyId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success('Google account disconnected.')
      }
    })
  }

  return (
    <>
      <div className="rounded-xl border border-border bg-background-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-[15px] font-bold text-foreground">Storage</h2>
          <p className="mt-0.5 text-[12px] text-foreground-lighter">
            Google Shared Drive where posts are automatically downloaded for all brands under this agency.
          </p>
        </div>
        <div className="p-5 space-y-3">
          {connectedEmail ? (
            <>
              {/* Connected account row */}
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle size={16} className="text-brand flex-shrink-0" />
                  <div>
                    <p className="text-[12px] font-medium text-foreground">{connectedEmail}</p>
                    <p className="text-[11px] text-foreground-muted">Google account connected</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={isPending}
                  onClick={handleDisconnect}
                  className="text-destructive hover:text-destructive"
                >
                  Disconnect
                </Button>
              </div>

              {/* Folder selection row */}
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <div>
                  <p className="text-[12px] font-medium text-foreground">
                    {folderId ? 'Shared Drive folder selected' : 'No folder selected'}
                  </p>
                  {folderId && (
                    <p className="text-[11px] text-foreground-muted font-mono truncate max-w-[260px]">
                      {folderId}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                  {folderId ? 'Change folder' : 'Choose folder'}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-2.5">
                <HardDrive size={16} className="flex-shrink-0 text-foreground-muted" />
                <p className="text-[12px] text-foreground-muted">
                  Connect a Google account to choose a Shared Drive.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  window.location.href = `/api/auth/google-drive?agencyId=${agencyId}&returnTo=/agency/${agencySlug}/settings&section=storage`
                }}
              >
                Connect Google
              </Button>
            </div>
          )}
        </div>
      </div>

      {pickerOpen && (
        <AgencyFolderPickerDialog
          agencyId={agencyId}
          agencyName={agencyName}
          currentFolderId={folderId}
          defaultOpen
          onClose={() => setPickerOpen(false)}
          onFolderSelected={(id) => setFolderId(id)}
        />
      )}
    </>
  )
}
