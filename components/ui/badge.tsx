import { cn } from '@/lib/utils'

type BadgeVariant =
  | 'active'
  | 'draft'
  | 'ended'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'success'
  | 'warning'
  | 'destructive'
  | 'muted'
  | 'info'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  active:      'bg-brand-muted text-brand border-brand/20',
  draft:       'bg-background-muted text-foreground-lighter border-border',
  ended:       'bg-background-muted text-foreground-muted border-border',
  instagram:   'bg-platform-instagram-muted dark:bg-platform-instagram/15 text-platform-instagram border-platform-instagram/20',
  tiktok:      'bg-platform-tiktok-muted dark:bg-platform-tiktok/15 text-platform-tiktok border-platform-tiktok/20',
  youtube:     'bg-platform-youtube-muted dark:bg-platform-youtube/15 text-platform-youtube border-platform-youtube/20',
  success:     'bg-brand-muted text-brand border-brand/20',
  warning:     'bg-warning-muted text-warning border-warning/25',
  destructive: 'bg-destructive-muted text-destructive border-destructive/20',
  muted:       'bg-background-muted text-foreground-muted border-border',
  info:        'bg-info-muted dark:bg-info/15 text-info border-info/20',
}

const dotClasses: Record<BadgeVariant, string> = {
  active:      'bg-brand',
  draft:       'bg-foreground-lighter',
  ended:       'bg-foreground-muted',
  instagram:   'bg-platform-instagram',
  tiktok:      'bg-platform-tiktok',
  youtube:     'bg-platform-youtube',
  success:     'bg-brand',
  warning:     'bg-warning',
  destructive: 'bg-destructive',
  muted:       'bg-foreground-muted',
  info:        'bg-info',
}

export function Badge({ variant = 'muted', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5',
        'text-[11px] font-medium',
        variantClasses[variant],
        className
      )}
    >
      <span className={cn('h-[5px] w-[5px] shrink-0 rounded-full', dotClasses[variant])} />
      {children}
    </span>
  )
}
