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
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background-surface px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
      <div>
        <p className="text-[13px] font-semibold text-foreground">Your content is saved to Google Drive</p>
        <p className="text-[11px] text-foreground-lighter mt-0.5">
          Storage: <strong className="text-foreground">{storageLabel}</strong>
          {' · '}Auto-updated when new posts are downloaded
        </p>
      </div>
      {driveUrl && (
        <a
          href={driveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full shrink-0 rounded-lg border border-border bg-background px-3 py-1.5 text-center text-[12px] font-medium text-foreground hover:border-border-strong transition-colors sm:w-auto"
        >
          Open Drive →
        </a>
      )}
    </div>
  )
}
