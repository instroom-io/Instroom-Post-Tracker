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
              <div className="flex flex-wrap items-center justify-between gap-y-2 rounded-lg border border-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <CheckCircle size={16} className="text-brand flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-foreground truncate">{connectedEmail}</p>
                    <p className="text-[11px] text-foreground-muted">Google account connected</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  loading={isPending}
                  onClick={handleDisconnect}
                  className="flex-shrink-0 text-destructive hover:text-destructive"
                >
                  Disconnect
                </Button>
              </div>

              {/* Folder selection row */}
              <div className="flex flex-wrap items-center justify-between gap-y-2 rounded-lg border border-border px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-foreground">
                    {folderId ? 'Shared Drive folder selected' : 'No folder selected'}
                  </p>
                  {folderId && (
                    <p className="text-[11px] text-foreground-muted font-mono truncate">
                      {folderId}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" className="flex-shrink-0" onClick={() => setPickerOpen(true)}>
                  {folderId ? 'Change folder' : 'Choose folder'}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-y-2 rounded-lg border border-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <HardDrive size={16} className="flex-shrink-0 text-foreground-muted" />
                  <p className="text-[12px] text-foreground-muted">
                    Connect a Google account to choose a Shared Drive.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0"
                  onClick={() => {
                    window.location.href = `/api/auth/google-drive?agencyId=${agencyId}&returnTo=/agency/${agencySlug}/settings&section=storage`
                  }}
                >
                  Connect Google
                </Button>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30 px-3.5 py-2.5">
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  <span className="font-semibold">Note:</span> Google will show a &quot;This app isn&apos;t verified&quot; warning. This is expected — click <span className="font-semibold">Advanced</span> → <span className="font-semibold">Go to Instroom Post Tracker (unsafe)</span> to continue. The app is safe to use.
                </p>
              </div>
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
