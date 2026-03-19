interface Props {
  driveConnectionType: 'agency' | 'brand' | null
  driveFolderId: string | null
  agencyName: string | null
}

export function DriveStatusBanner({ driveConnectionType, driveFolderId, agencyName }: Props) {
  const driveUrl = driveFolderId
    ? `https://drive.google.com/drive/folders/${driveFolderId}`
    : null

  const storageLabel = driveConnectionType === 'brand'
    ? 'Your Google Drive'
    : driveConnectionType === 'agency'
    ? `${agencyName ?? 'Agency'} Drive`
    : 'Google Drive (not configured)'

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-background-surface px-5 py-3">
      <div>
        <p className="text-sm font-semibold text-foreground">📂 Your content is saved to Google Drive</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Storage: <strong className="text-foreground">{storageLabel}</strong>
          {' · '}Auto-updated when new posts are downloaded
        </p>
      </div>
      {driveUrl && (
        <a
          href={driveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:border-foreground/30 transition-colors"
        >
          Open Drive →
        </a>
      )}
    </div>
  )
}
