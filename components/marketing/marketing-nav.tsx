'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { List, X } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMarketingContact } from '@/components/marketing/marketing-contact-provider'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export function MarketingNav() {
  const { setOpen } = useMarketingContact()
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
        scrolled ? 'bg-background/80 backdrop-blur-md border-b border-border' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Wordmark */}
        <Link href="/">
          <img src="/POST_TRACKER.svg" alt="Instroom Post Tracker" className="h-12 w-auto" />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden lg:flex gap-8">
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
        <div className="hidden lg:flex items-center gap-4">
          <Link href="/login" className="text-foreground-lighter hover:text-foreground text-sm transition-colors">Sign in</Link>
          <button
            onClick={() => setOpen(true)}
            className="text-foreground-lighter hover:text-foreground text-sm transition-colors"
          >
            Contact Us
          </button>
          <Link
            href="/request-access"
            className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand/90 dark:hover:shadow-[0_0_20px_rgba(31,174,91,0.4)] transition-all"
          >
            Request Access
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
            className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl pt-20"
          >
            <button className="absolute top-5 right-6" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X size={20} className="text-foreground-lighter" />
            </button>
            <div className="flex flex-col items-center gap-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="text-foreground-light text-lg font-medium"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="text-foreground-light text-lg font-medium"
              >
                Sign in
              </Link>
              <button
                onClick={() => { setMobileOpen(false); setOpen(true) }}
                className="text-foreground-lighter text-lg font-medium"
              >
                Contact Us
              </button>
              <Link
                href="/request-access"
                onClick={() => setMobileOpen(false)}
                className="bg-brand text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand/90 transition-all mt-4"
              >
                Request Access
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
