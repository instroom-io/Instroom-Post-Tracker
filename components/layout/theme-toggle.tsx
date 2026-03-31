'use client'

import { Sun, Moon } from '@phosphor-icons/react'
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from 'next-themes'

interface Particle {
  id: number
  delay: number
  duration: number
}

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [particles, setParticles] = useState<Particle[]>([])
  const [isAnimating, setIsAnimating] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)

  const isDark = mounted && (theme === 'dark' || resolvedTheme === 'dark')

  useEffect(() => { setMounted(true) }, [])

  const generateParticles = () => {
    const newParticles: Particle[] = []
    for (let i = 0; i < 3; i++) {
      newParticles.push({ id: i, delay: i * 0.1, duration: 0.6 + i * 0.1 })
    }
    setParticles(newParticles)
    setIsAnimating(true)
    setTimeout(() => {
      setIsAnimating(false)
      setParticles([])
    }, 1000)
  }

  const handleToggle = () => {
    generateParticles()
    setTheme(isDark ? 'light' : 'dark')
  }

  if (!mounted) {
    return (
      <div className="relative inline-block">
        <div className="relative flex h-[28px] w-[48px] items-center rounded-full bg-muted p-1" />
      </div>
    )
  }

  return (
    <div className="relative inline-block">
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="grain-light">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" result="desaturatedNoise" />
            <feComponentTransfer in="desaturatedNoise" result="lightGrain">
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feBlend in="SourceGraphic" in2="lightGrain" mode="overlay" />
          </filter>
          <filter id="grain-dark">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" result="desaturatedNoise" />
            <feComponentTransfer in="desaturatedNoise" result="darkGrain">
              <feFuncA type="linear" slope="0.5" />
            </feComponentTransfer>
            <feBlend in="SourceGraphic" in2="darkGrain" mode="overlay" />
          </filter>
        </defs>
      </svg>

      <motion.button
        ref={toggleRef}
        onClick={handleToggle}
        className="relative flex h-[28px] w-[48px] items-center rounded-full p-[3px] transition-all duration-300 focus:outline-none"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse at top left, #1e293b 0%, #0f172a 40%, #020617 100%)'
            : 'radial-gradient(ellipse at top left, #ffffff 0%, #f1f5f9 40%, #cbd5e1 100%)',
          boxShadow: isDark
            ? `inset 5px 5px 12px rgba(0,0,0,0.9),inset -5px -5px 12px rgba(71,85,105,0.4),inset 8px 8px 16px rgba(0,0,0,0.7),inset -8px -8px 16px rgba(100,116,139,0.2),inset 0 2px 4px rgba(0,0,0,1),inset 0 -2px 4px rgba(71,85,105,0.4),inset 0 0 20px rgba(0,0,0,0.6),0 1px 1px rgba(255,255,255,0.05),0 2px 4px rgba(0,0,0,0.4),0 8px 16px rgba(0,0,0,0.4),0 16px 32px rgba(0,0,0,0.3),0 24px 48px rgba(0,0,0,0.2)`
            : `inset 5px 5px 12px rgba(148,163,184,0.5),inset -5px -5px 12px rgba(255,255,255,1),inset 8px 8px 16px rgba(100,116,139,0.3),inset -8px -8px 16px rgba(255,255,255,0.9),inset 0 2px 4px rgba(148,163,184,0.4),inset 0 -2px 4px rgba(255,255,255,1),inset 0 0 20px rgba(203,213,225,0.3),0 1px 2px rgba(255,255,255,1),0 2px 4px rgba(0,0,0,0.1),0 8px 16px rgba(0,0,0,0.08),0 16px 32px rgba(0,0,0,0.06),0 24px 48px rgba(0,0,0,0.04)`,
          border: isDark
            ? '2px solid rgba(51,65,85,0.6)'
            : '2px solid rgba(203,213,225,0.6)',
        }}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        role="switch"
        aria-checked={isDark}
        whileTap={{ scale: 0.98 }}
      >
        {/* Inner inset shadow layer */}
        <div
          className="absolute inset-[1px] rounded-full pointer-events-none"
          style={{
            boxShadow: isDark
              ? 'inset 0 2px 6px rgba(0,0,0,0.9), inset 0 -1px 3px rgba(71,85,105,0.3)'
              : 'inset 0 2px 6px rgba(100,116,139,0.4), inset 0 -1px 3px rgba(255,255,255,0.8)',
          }}
        />

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: isDark
              ? 'radial-gradient(ellipse at top, rgba(71,85,105,0.15) 0%, transparent 50%), linear-gradient(to bottom, rgba(71,85,105,0.2) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.3) 100%)'
              : 'radial-gradient(ellipse at top, rgba(255,255,255,0.8) 0%, transparent 50%), linear-gradient(to bottom, rgba(255,255,255,0.7) 0%, transparent 30%, transparent 70%, rgba(148,163,184,0.15) 100%)',
            mixBlendMode: 'overlay',
          }}
        />

        {/* Depth vignette */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            boxShadow: isDark
              ? 'inset 0 0 15px rgba(0,0,0,0.5)'
              : 'inset 0 0 15px rgba(148,163,184,0.2)',
          }}
        />

        {/* Background icons */}
        <div className="absolute inset-0 flex items-center justify-between px-2">
          <Sun size={9} className={isDark ? 'text-yellow-100' : 'text-amber-600'} />
          <Moon size={9} className={isDark ? 'text-yellow-100' : 'text-slate-700'} />
        </div>

        {/* Knob */}
        <motion.div
          className="relative z-10 flex h-[20px] w-[20px] items-center justify-center rounded-full overflow-hidden"
          style={{
            background: isDark
              ? 'linear-gradient(145deg, #64748b 0%, #475569 50%, #334155 100%)'
              : 'linear-gradient(145deg, #ffffff 0%, #fefefe 50%, #f8fafc 100%)',
            boxShadow: isDark
              ? `inset 2px 2px 4px rgba(100,116,139,0.4),inset -2px -2px 4px rgba(0,0,0,0.8),inset 0 1px 1px rgba(255,255,255,0.15),0 1px 2px rgba(255,255,255,0.1),0 8px 32px rgba(0,0,0,0.6),0 4px 12px rgba(0,0,0,0.5),0 2px 4px rgba(0,0,0,0.4)`
              : `inset 2px 2px 4px rgba(203,213,225,0.3),inset -2px -2px 4px rgba(255,255,255,1),inset 0 1px 2px rgba(255,255,255,1),0 1px 2px rgba(255,255,255,1),0 8px 32px rgba(0,0,0,0.18),0 4px 12px rgba(0,0,0,0.12),0 2px 4px rgba(0,0,0,0.08)`,
            border: isDark
              ? '2px solid rgba(148,163,184,0.3)'
              : '2px solid rgba(255,255,255,0.9)',
          }}
          animate={{ x: isDark ? 22 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          {/* Knob gloss */}
          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, transparent 40%, rgba(0,0,0,0.1) 100%)',
              mixBlendMode: 'overlay',
            }}
          />

          {/* Particle burst on toggle */}
          {isAnimating && particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <motion.div
                className="absolute rounded-full"
                style={{
                  width: '10px',
                  height: '10px',
                  background: isDark
                    ? 'radial-gradient(circle, rgba(147,197,253,0.5) 0%, rgba(147,197,253,0) 70%)'
                    : 'radial-gradient(circle, rgba(251,191,36,0.7) 0%, rgba(251,191,36,0) 70%)',
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: isDark ? 6 : 8, opacity: [0, 1, 0] }}
                transition={{ duration: isDark ? 0.5 : particle.duration, delay: particle.delay, ease: 'easeOut' }}
              />
            </motion.div>
          ))}

          {/* Knob icon */}
          <div className="relative z-10">
            {isDark ? (
              <Moon size={9} className="text-yellow-200" />
            ) : (
              <Sun size={9} className="text-amber-500" />
            )}
          </div>
        </motion.div>
      </motion.button>
    </div>
  )
}
