'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { disconnectGoogleDrive } from '@/lib/actions/account'
import { CheckCircle } from '@phosphor-icons/react'

interface GoogleDriveCardProps {
  connectedEmail: string | null
}

export function GoogleDriveCard({ connectedEmail }: GoogleDriveCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

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
    <div className="rounded-xl border border-border bg-background-surface shadow-sm">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-display text-[15px] font-bold text-foreground">Google Drive</h2>
        <p className="mt-0.5 text-[12px] text-foreground-lighter">
          Connect your personal Google Drive to save posts with one click.
        </p>
      </div>
      <div className="p-5">
        {connectedEmail ? (
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
  )
}
