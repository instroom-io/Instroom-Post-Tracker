import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
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
  ({ label, error, hint, options, placeholder, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-[12px] font-medium text-foreground-light">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              'h-9 w-full appearance-none rounded-lg border bg-background-surface pl-3 pr-8 text-[13px] text-foreground',
              'focus:outline-none focus:ring-2 transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                : 'border-border focus:border-brand focus:ring-brand/20',
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
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground-muted"
          />
        </div>
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
Select.displayName = 'Select'
