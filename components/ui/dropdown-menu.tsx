'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// ─── Context ──────────────────────────────────────────────────────────────────

interface DropdownContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  containerRef: { current: HTMLDivElement | null }
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
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <DropdownContext.Provider value={{ open, setOpen, containerRef: ref }}>
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
    <span onClick={() => setOpen(!open)} className="contents">
      {children}
    </span>
  )
}

// ─── Content ─────────────────────────────────────────────────────────────────

type DropdownAlign = 'start' | 'end' | 'center'

interface DropdownMenuContentProps {
  children: ReactNode
  align?: DropdownAlign
  side?: 'top' | 'bottom'
  className?: string
}

export function DropdownMenuContent({
  children,
  align = 'start',
  side: _side,
  className,
}: DropdownMenuContentProps) {
  const { open, containerRef } = useDropdownContext()
  const [resolvedSide, setResolvedSide] = useState<'top' | 'bottom'>('bottom')
  const [coords, setCoords] = useState<{
    top?: number
    bottom?: number
    left?: number
    right?: number
  } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const side = spaceBelow < 160 && spaceAbove > spaceBelow ? 'top' : 'bottom'
      setResolvedSide(side)

      const c: { top?: number; bottom?: number; left?: number; right?: number } = {}
      if (side === 'bottom') {
        c.top = rect.bottom + 4
      } else {
        c.bottom = window.innerHeight - rect.top + 4
      }
      if (align === 'end') {
        c.right = window.innerWidth - rect.right
      } else if (align === 'center') {
        c.left = rect.left + rect.width / 2
      } else {
        c.left = rect.left
      }
      setCoords(c)
    }
  }, [open, containerRef, align])

  if (!mounted) return null

  const yInit = resolvedSide === 'top' ? 4 : -4

  return createPortal(
    <AnimatePresence>
      {open && coords && (
        <motion.div
          role="menu"
          initial={{ opacity: 0, y: yInit, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: yInit, scale: 0.97 }}
          transition={{ duration: 0.1 }}
          style={{
            position: 'fixed',
            ...coords,
            ...(align === 'center' ? { transform: 'translateX(-50%)' } : {}),
            zIndex: 9999,
          }}
          className={cn(
            'min-w-[160px] rounded-xl border border-border bg-background-surface shadow-md',
            className
          )}
        >
          <div className="p-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ─── Item ─────────────────────────────────────────────────────────────────────

interface DropdownMenuItemProps {
  children: ReactNode
  onClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  variant?: 'default' | 'destructive'
  disabled?: boolean
  className?: string
}

export function DropdownMenuItem({
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
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
      role="menuitem"
      onClick={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={disabled}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-[12px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50',
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
    <div className="px-3 py-1.5 text-[11px] font-semibold text-foreground-muted">
      {children}
    </div>
  )
}
