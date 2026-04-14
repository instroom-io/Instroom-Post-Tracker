'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { List, X } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export function MarketingNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault()
    setMobileOpen(false)
    if (pathname === '/') {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
    } else {
      router.push(`/${href}`)
    }
  }

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled && !mobileOpen ? 'bg-background/80 backdrop-blur-md border-b border-border' : 'bg-transparent'
      }`}
    >
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Wordmark */}
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/POST_TRACKER.svg" alt="Instroom Post Tracker" className="h-16 w-auto" />
        </Link>

        {/* Desktop nav links — absolutely centered */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 lg:flex gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleNavClick(e, link.href)}
              className="text-foreground-lighter hover:text-brand text-sm font-medium transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden lg:flex items-center gap-3">
          <Link href="/login" className="text-foreground-lighter hover:text-foreground text-sm font-medium transition-colors">
            Log in
          </Link>
          <Link
            href="/signup"
            className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand/90 dark:hover:shadow-[0_0_20px_rgba(31,174,91,0.4)] transition-all"
          >
            Start free trial
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          <List size={20} className="text-foreground-lighter" />
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-marketing-dark pt-20"
          >
            <button className="absolute top-5 right-6" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X size={20} className="text-white/50 hover:text-white transition-colors" />
            </button>
            <div className="flex flex-col items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="text-white/70 hover:text-white text-lg font-medium transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="text-white/70 hover:text-white text-lg font-medium transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="bg-brand text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand/90 transition-all mt-4"
              >
                Start free trial
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
