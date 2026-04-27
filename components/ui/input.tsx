'use client'

import { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  error?: string
  hint?: string
  prefix?: string
  size?: 'default' | 'lg'
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, size = 'default', className, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[12px] font-medium text-foreground-light">
            {label}
          </label>
        )}
        <div className="relative">
          {prefix && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none text-[13px] text-foreground-muted">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-lg border bg-background-surface text-[13px] text-foreground',
              'placeholder:text-foreground-muted',
              'focus:outline-none focus-visible:ring-2 transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
              size === 'default' ? 'h-9' : 'h-10',
              prefix ? 'pl-6 pr-3' : 'px-3',
              error
                ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                : 'border-border focus-visible:border-brand focus-visible:ring-brand/20',
              className
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
        </div>
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-[11px] text-foreground-lighter">{hint}</p>
        )}
        {error && (
          <p id={`${inputId}-error`} className="text-[11px] text-destructive">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
