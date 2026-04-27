'use client'

import { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id: externalId, ...props }, ref) => {
    const generatedId = useId()
    const textareaId = externalId ?? generatedId

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-[12px] font-medium text-foreground-light">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          className={cn(
            'min-h-[80px] w-full resize-y rounded-lg border bg-background-surface px-3 py-2',
            'text-[13px] text-foreground placeholder:text-foreground-muted',
            'focus-visible:outline-none focus-visible:ring-2 transition-colors',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
              : 'border-border focus-visible:border-brand focus-visible:ring-brand/20',
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="text-[11px] text-foreground-lighter">{hint}</p>
        )}
        {error && (
          <p id={`${textareaId}-error`} className="text-[11px] text-destructive">{error}</p>
        )}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
