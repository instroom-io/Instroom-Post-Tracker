import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-[12px] font-medium text-foreground-light">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'min-h-[80px] w-full resize-y rounded-lg border bg-background-surface px-3 py-2',
            'text-[13px] text-foreground placeholder:text-foreground-muted',
            'focus:outline-none focus:ring-2 transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-50',
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
Textarea.displayName = 'Textarea'
