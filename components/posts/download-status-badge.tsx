import { Tooltip } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import type { DownloadStatus } from '@/lib/types'

interface DownloadStatusBadgeProps {
  status: DownloadStatus
  blockedReason?: string | null
  driveUrl?: string | null
  driveFolderPath?: string | null
}

export function DownloadStatusBadge({
  status,
  blockedReason,
  driveUrl,
  driveFolderPath,
}: DownloadStatusBadgeProps) {
  switch (status) {
    case 'pending':
      return (
        <Tooltip content="Waiting for download worker">
          <Badge variant="muted">Pending</Badge>
        </Tooltip>
      )

    case 'downloaded':
      return (
        <Tooltip content={driveFolderPath ?? 'Saved to Google Drive'}>
          {driveUrl ? (
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Badge variant="success">Downloaded</Badge>
            </a>
          ) : (
            <Badge variant="success">Downloaded</Badge>
          )}
        </Tooltip>
      )

    case 'blocked':
      return (
        <Tooltip
          content={
            blockedReason === 'no_usage_rights'
              ? 'No usage rights granted'
              : 'Download blocked'
          }
        >
          <Badge variant="warning">Blocked</Badge>
        </Tooltip>
      )

    case 'failed':
      return (
        <Tooltip content="Download failed — will retry automatically">
          <Badge variant="destructive">Failed</Badge>
        </Tooltip>
      )

    default:
      return <Badge variant="muted">{status}</Badge>
  }
}
