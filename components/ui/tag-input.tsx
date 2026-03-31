'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  prefix?: '#' | '@'
  label?: string
  error?: string
  hint?: string
  disabled?: boolean
}

export function TagInput({
  tags,
  onChange,
  placeholder,
  prefix,
  label,
  error,
  hint,
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(raw: string) {
    // Strip prefix characters and whitespace
    let value = raw.trim()
    if (prefix === '#') value = value.replace(/^#+/, '')
    if (prefix === '@') value = value.replace(/^@+/, '')
    value = value.trim()

    if (!value || tags.includes(value)) return

    onChange([...tags, value])
    setInputValue('')
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1)
    }
  }

  function handleBlur() {
    if (inputValue.trim()) addTag(inputValue)
  }

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-[12px] font-medium text-foreground-light">
          {label}
        </label>
      )}

      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          'flex min-h-[36px] w-full flex-wrap items-center gap-1.5 rounded-lg border bg-background-surface px-2.5 py-1.5 transition-colors cursor-text',
          error
            ? 'border-destructive'
            : 'border-border focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {tags.map((tag, i) => (
          <span
            key={i}
            className="flex items-center gap-1 rounded-md bg-background-muted px-2 py-0.5 text-[12px] text-foreground"
          >
            {prefix && (
              <span className="text-foreground-muted">{prefix}</span>
            )}
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeTag(i)
                }}
                className="text-foreground-muted transition-colors hover:text-foreground"
              >
                <X size={10} />
              </button>
            )}
          </span>
        ))}

        {prefix && (
          <span className="select-none text-[13px] font-medium text-foreground-muted">{prefix}</span>
        )}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={tags.length === 0 ? (placeholder ?? 'Type and press Enter…') : ''}
          className="h-6 min-w-[60px] flex-1 bg-transparent text-[13px] text-foreground placeholder:text-foreground-muted outline-none"
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
