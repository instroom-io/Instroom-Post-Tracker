interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex min-h-14 items-center justify-between border-b border-border bg-background-surface px-5 py-3">
      <div>
        <h1 className="font-display text-[16px] font-extrabold text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-[11px] text-foreground-lighter">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
