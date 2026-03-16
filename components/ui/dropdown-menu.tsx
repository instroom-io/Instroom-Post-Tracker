'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// ─── Context ──────────────────────────────────────────────────────────────────

interface DropdownContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const DropdownContext = createContext<DropdownContextValue | null>(null)

function useDropdownContext() {
  const ctx = useContext(DropdownContext)
  if (!ctx) throw new Error('DropdownMenu components must be used within <DropdownMenu>')
  return ctx
}

// ─── Root ─────────────────────────────────────────────────────────────────────

interface DropdownMenuProps {
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DropdownMenu({ children, open: controlledOpen, onOpenChange }: DropdownMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const ref = useRef<HTMLDivElement>(null)

  function setOpen(val: boolean) {
    if (!isControlled) setUncontrolledOpen(val)
    onOpenChange?.(val)
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative inline-block">
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

// ─── Trigger ─────────────────────────────────────────────────────────────────

export function DropdownMenuTrigger({ children, asChild: _asChild }: { children: ReactNode; asChild?: boolean }) {
  const { open, setOpen } = useDropdownContext()

  return (
    <span onClick={() => setOpen(!open)} className="contents cursor-pointer">
      {children}
    </span>
  )
}

// ─── Content ─────────────────────────────────────────────────────────────────

type DropdownAlign = 'start' | 'end' | 'center'

interface DropdownMenuContentProps {
  children: ReactNode
  align?: DropdownAlign
  className?: string
}

const alignClasses: Record<DropdownAlign, string> = {
  start: 'left-0',
  end: 'right-0',
  center: 'left-1/2 -translate-x-1/2',
}

export function DropdownMenuContent({
  children,
  align = 'start',
  className,
}: DropdownMenuContentProps) {
  const { open } = useDropdownContext()

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.97 }}
          transition={{ duration: 0.1 }}
          className={cn(
            'absolute top-full z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-background-surface shadow-lg',
            alignClasses[align],
            className
          )}
        >
          <div className="p-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Item ─────────────────────────────────────────────────────────────────────

interface DropdownMenuItemProps {
  children: ReactNode
  onClick?: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
  className?: string
}

export function DropdownMenuItem({
  children,
  onClick,
  variant = 'default',
  disabled = false,
  className,
}: DropdownMenuItemProps) {
  const { setOpen } = useDropdownContext()

  function handleClick() {
    if (disabled) return
    onClick?.()
    setOpen(false)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-[12px] transition-colors',
        variant === 'default'
          ? 'text-foreground hover:bg-background-muted'
          : 'text-destructive hover:bg-destructive-muted',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {children}
    </button>
  )
}

// ─── Separator ───────────────────────────────────────────────────────────────

export function DropdownMenuSeparator() {
  return <div className="-mx-1 my-1 border-t border-border" />
}

// ─── Label ───────────────────────────────────────────────────────────────────

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
      {children}
    </div>
  )
}
