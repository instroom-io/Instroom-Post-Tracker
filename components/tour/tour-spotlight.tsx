'use client'

import { motion } from 'framer-motion'

export interface TourRect {
  x: number
  y: number
  width: number
  height: number
}

interface TourSpotlightProps {
  targetRect: TourRect | null
  onClickOverlay: () => void
}

const PAD = 6
const RADIUS = 8

export function TourSpotlight({ targetRect, onClickOverlay }: TourSpotlightProps) {
  if (!targetRect) return null

  const cx = targetRect.x - PAD
  const cy = targetRect.y - PAD
  const cw = targetRect.width + PAD * 2
  const ch = targetRect.height + PAD * 2

  return (
    <div
      className="fixed inset-0 z-[9998]"
      style={{ pointerEvents: 'auto' }}
      onClick={onClickOverlay}
    >
      {/* SVG overlay with cutout */}
      <svg className="absolute inset-0 h-full w-full" style={{ display: 'block' }}>
        <defs>
          <mask id="tour-spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <motion.rect
              animate={{ x: cx, y: cy, width: cw, height: ch }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              rx={RADIUS}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Glow ring around spotlit element */}
      <motion.div
        className="pointer-events-none absolute"
        animate={{ left: cx, top: cy, width: cw, height: ch }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        style={{
          borderRadius: RADIUS,
          boxShadow: '0 0 0 3px rgba(31,174,91,0.35), 0 0 0 6px rgba(31,174,91,0.12)',
        }}
      />
    </div>
  )
}
