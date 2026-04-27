'use client'

import { forwardRef, useId } from 'react'
import { CaretDown } from '@phosphor-icons/react/dist/ssr'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className, id: externalId, ...props }, ref) => {
    const generatedId = useId()
    const selectId = externalId ?? generatedId

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-[12px] font-medium text-foreground-light">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
            className={cn(
              'h-9 w-full appearance-none rounded-lg border bg-background-surface pl-3 pr-8 text-[13px] text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20'
                : 'border-border focus-visible:border-brand focus-visible:ring-brand/20',
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <CaretDown
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-muted"
          />
        </div>
        {hint && !error && (
          <p id={`${selectId}-hint`} className="text-[11px] text-foreground-lighter">{hint}</p>
        )}
        {error && (
          <p id={`${selectId}-error`} className="text-[11px] text-destructive">{error}</p>
        )}
      </div>
    )
  }
)
Select.displayName = 'Select'
