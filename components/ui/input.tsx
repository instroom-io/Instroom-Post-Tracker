import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  hint?: string
  size?: 'default' | 'lg'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, size = 'default', className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-[12px] font-medium text-foreground-light">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-lg border bg-background-surface px-3 text-[13px] text-foreground',
            'placeholder:text-foreground-muted',
            'focus:outline-none focus:ring-2 transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-50',
            size === 'default' ? 'h-9' : 'h-10',
            error
              ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
              : 'border-border focus:border-brand focus:ring-brand/20',
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="text-[11px] text-foreground-lighter">{hint}</p>
        )}
        {error && (
          <p className="text-[11px] text-destructive">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
