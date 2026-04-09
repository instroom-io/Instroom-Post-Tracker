'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AgencyFolderPickerDialog } from '@/components/agency/agency-folder-picker-dialog'
import { CheckCircle, HardDrive } from '@phosphor-icons/react'

interface AgencyDriveCardProps {
  agencyId: string
  agencyName: string
  connectedEmail: string | null
  currentFolderId: string | null
}

export function AgencyDriveCard({
  agencyId,
  agencyName,
  connectedEmail,
  currentFolderId,
}: AgencyDriveCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <>
      <div className="rounded-xl border border-border bg-background-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-[15px] font-bold text-foreground">Storage</h2>
          <p className="mt-0.5 text-[12px] text-foreground-lighter">
            Google Shared Drive where posts are automatically downloaded for all brands under this agency.
          </p>
        </div>
        <div className="p-5">
          {connectedEmail ? (
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle size={16} className="text-brand flex-shrink-0" />
                <div>
                  <p className="text-[12px] font-medium text-foreground">{agencyName}</p>
                  <p className="text-[11px] text-foreground-muted">
                    {currentFolderId ? `Folder: ${currentFolderId}` : 'No folder selected'}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
                {currentFolderId ? 'Change folder' : 'Choose folder'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <HardDrive size={20} className="flex-shrink-0 text-foreground-muted" />
              <p className="text-[12px] text-foreground-muted">
                Connect your Google account in{' '}
                <Link href="/account/settings" className="text-brand hover:underline">
                  Account Settings
                </Link>{' '}
                to link a Shared Drive for automatic post downloads.
              </p>
            </div>
          )}
        </div>
      </div>

      {pickerOpen && (
        <AgencyFolderPickerDialog
          agencyId={agencyId}
          agencyName={agencyName}
          currentFolderId={currentFolderId}
          defaultOpen
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  )
}
