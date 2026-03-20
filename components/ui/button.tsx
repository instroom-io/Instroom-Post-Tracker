import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'outline'
  | 'link'

type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  asChild?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand/90 active:bg-brand/80 shadow-xs hover:shadow-sm',
  secondary:
    'border border-border-strong bg-background-surface text-foreground hover:bg-background-muted shadow-xs',
  ghost:
    'text-foreground hover:bg-background-muted',
  destructive:
    'bg-destructive text-white hover:bg-destructive/90',
  outline:
    'border border-border text-foreground hover:bg-background-muted',
  link:
    'text-brand underline-offset-4 hover:underline p-0 h-auto',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[12px]',
  md: 'h-9 px-4 text-[13px]',
  lg: 'h-10 px-5 text-[13px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors',
          'disabled:cursor-not-allowed disabled:opacity-60',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
          variant !== 'link' && sizeClasses[size],
          variantClasses[variant],
          className
        )}
        {...props}
      >
        {loading && <Loader2 size={14} className="animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
