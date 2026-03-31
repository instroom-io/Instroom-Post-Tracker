'use client'

import { useState, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ visibility: 'hidden' })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!visible) {
      setTooltipStyle({ visibility: 'hidden' })
      return
    }
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tipRect = tooltipRef.current.getBoundingClientRect()
    const GAP = 6
    const MARGIN = 8

    let top = 0
    let left = 0

    if (side === 'top') {
      top = triggerRect.top - tipRect.height - GAP
      left = triggerRect.left + triggerRect.width / 2 - tipRect.width / 2
    } else if (side === 'bottom') {
      top = triggerRect.bottom + GAP
      left = triggerRect.left + triggerRect.width / 2 - tipRect.width / 2
    } else if (side === 'left') {
      top = triggerRect.top + triggerRect.height / 2 - tipRect.height / 2
      left = triggerRect.left - tipRect.width - GAP
    } else {
      top = triggerRect.top + triggerRect.height / 2 - tipRect.height / 2
      left = triggerRect.right + GAP
    }

    // Clamp to viewport with margin
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - tipRect.width - MARGIN))
    top = Math.max(MARGIN, Math.min(top, window.innerHeight - tipRect.height - MARGIN))

    setTooltipStyle({ top, left, visibility: 'visible' })
  }, [visible, side])

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}

      {visible && content && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            style={tooltipStyle}
            className={cn(
              'pointer-events-none fixed z-[9999] max-w-xs w-max',
              'rounded-md bg-foreground px-2.5 py-2',
              'text-[11px] text-background',
              className
            )}
          >
            {content}
          </div>,
          document.body
        )
      }
    </div>
  )
}
