interface PageHeaderProps {
  title?: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-4 py-3 sm:px-5">
      {(title || description) && (
        <div>
          {title && (
            <h1 className="font-display text-[16px] font-extrabold text-foreground">
              {title}
            </h1>
          )}
          {description && (
            <p className="text-[11px] text-foreground-lighter">{description}</p>
          )}
        </div>
      )}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
