'use client'

import { motion, useScroll, useTransform, useMotionValue, animate } from 'framer-motion'
import { useRef, useEffect } from 'react'

const TAIL_DURATION = 0.3        // seconds before end to enter slow-motion drift
const SEEK_THRESHOLD = 0.05      // seek back when this close to the true end
const TAIL_PLAYBACK_RATE = 0.2   // 20% speed — slightly faster slow-mo

export function HeroVideo() {
  const ref = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const isInTailMode = useRef(false)
  const wasVisible = useRef(true) // true = section was visible on mount; prevents instant replay trigger
  const opacity = useMotionValue(0.7)

  const { scrollYProgress } = useScroll({ target: ref })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])

  // Tail-loop effect: play once, then freeze-loop the last TAIL_DURATION seconds
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    function handleTimeUpdate() {
      if (!video || !video.duration) return
      const tailStart = video.duration - TAIL_DURATION

      if (!isInTailMode.current && video.currentTime >= tailStart) {
        isInTailMode.current = true
        video.playbackRate = TAIL_PLAYBACK_RATE
      }

      if (isInTailMode.current && video.currentTime >= video.duration - SEEK_THRESHOLD) {
        video.currentTime = tailStart
      }
    }

    // Safety net if video somehow reaches ended state
    function handleEnded() {
      if (!video) return
      video.playbackRate = TAIL_PLAYBACK_RATE
      video.currentTime = video.duration - TAIL_DURATION
      video.play().catch(() => {})
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
    }
  }, [])

  // Explicit play on mount — autoPlay alone is unreliable in React/Next.js hydration
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.play().catch(() => {})
  }, [])

  // Replay from beginning when hero section re-enters viewport
  useEffect(() => {
    const video = videoRef.current
    const el = ref.current
    if (!video || !el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!wasVisible.current) {
              // Section re-entered: restart the full animation
              isInTailMode.current = false
              video.playbackRate = 1.0
              video.currentTime = 0
              video.play().catch(() => {})
              animate(opacity, 0.7, { duration: 0.6 })
            }
            wasVisible.current = true
          } else {
            wasVisible.current = false
          }
        })
      },
      { threshold: 0.1 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [opacity])

  return (
    <motion.div
      ref={ref}
      className="absolute inset-0 hidden lg:block pointer-events-none z-0"
      style={{ y }}
    >
      {/* Video with organic radial dissolve on all edges */}
      <motion.div
        className="absolute inset-0"
        style={{
          opacity,
          filter: 'saturate(1.1) brightness(0.75)',
          WebkitMaskImage:
            'radial-gradient(ellipse 70% 90% at 68% 50%, black 25%, transparent 72%)',
          maskImage:
            'radial-gradient(ellipse 70% 90% at 68% 50%, black 25%, transparent 72%)',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-contain"
          style={{ objectPosition: 'right center' }}
        >
          <source src="/marketing/Instroom_landing_video.mp4" type="video/mp4" />
        </video>
      </motion.div>

      {/* Left-side dark vignette — keeps text area clean */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to right, #091810 25%, transparent 40%)',
        }}
      />
    </motion.div>
  )
}
