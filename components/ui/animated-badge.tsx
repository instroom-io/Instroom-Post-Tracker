'use client'

import { useRef, useLayoutEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedBadgeProps {
  children: React.ReactNode
  className?: string
}

export function AnimatedBadge({ children, className }: AnimatedBadgeProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)

  useLayoutEffect(() => {
    if (ref.current) {
      const { width, height } = ref.current.getBoundingClientRect()
      setDims({ w: width, h: height })
    }
  }, [])

  const rx = 6 // matches rounded-md = 6px
  const sw = 2 // stroke width
  const pad = sw / 2

  const perimeter = dims
    ? 2 * (dims.w - 2 * rx) + 2 * (dims.h - 2 * rx) + 2 * Math.PI * rx
    : 0
  const snakeLen = perimeter * 0.75
  const gap = perimeter - snakeLen
  const headLen = Math.min(snakeLen * 0.18, 14)
  const animName = `snake-travel-${Math.round(perimeter)}`
  const animClass = `snake-anim-${Math.round(perimeter)}`

  return (
    <span className="relative inline-flex">
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-md border border-brand/20 px-1.5 py-0.5',
          'text-[11px] font-medium uppercase tracking-wide',
          'bg-brand-muted text-brand',
          className
        )}
      >
        {children}
      </span>

      {dims && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: dims.w,
            height: dims.h,
            overflow: 'visible',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <style>{`
            @keyframes ${animName} {
              from { stroke-dashoffset: ${perimeter}; }
              to   { stroke-dashoffset: 0; }
            }
            @media (prefers-reduced-motion: reduce) {
              .${animClass} { animation: none !important; }
            }
          `}</style>

          {/* Faint static border */}
          <rect
            x={pad} y={pad}
            width={dims.w - sw} height={dims.h - sw}
            rx={rx} ry={rx}
            fill="none"
            stroke="hsla(145,60%,50%,0.18)"
            strokeWidth="1"
          />

          {/* Glow layer */}
          <rect
            x={pad} y={pad}
            width={dims.w - sw} height={dims.h - sw}
            rx={rx} ry={rx}
            fill="none"
            stroke="hsl(145,90%,65%)"
            strokeWidth={sw + 3}
            strokeLinecap="round"
            strokeDasharray={`${snakeLen * 0.6} ${gap + snakeLen * 0.4}`}
            strokeDashoffset={perimeter}
            opacity={0.45}
            className={animClass}
            style={{
              filter: 'blur(3px)',
              animation: `${animName} 3s linear infinite`,
            }}
          />

          {/* Snake body */}
          <rect
            x={pad} y={pad}
            width={dims.w - sw} height={dims.h - sw}
            rx={rx} ry={rx}
            fill="none"
            stroke="hsl(145,92%,68%)"
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={`${snakeLen} ${gap}`}
            strokeDashoffset={perimeter}
            className={animClass}
            style={{ animation: `${animName} 3s linear infinite` }}
          />

          {/* Snake head — bright white-green tip */}
          <rect
            x={pad} y={pad}
            width={dims.w - sw} height={dims.h - sw}
            rx={rx} ry={rx}
            fill="none"
            stroke="hsl(155,100%,92%)"
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={`${headLen} ${perimeter - headLen}`}
            strokeDashoffset={perimeter}
            className={animClass}
            style={{ animation: `${animName} 3s linear infinite` }}
          />
        </svg>
      )}
    </span>
  )
}
