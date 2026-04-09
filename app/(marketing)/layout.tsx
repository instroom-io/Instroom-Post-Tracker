'use client'

import { MarketingContactProvider } from '@/components/marketing/marketing-contact-provider'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { ContactModal } from '@/components/marketing/contact-modal'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MarketingContactProvider>
      <div className="min-h-screen overflow-x-hidden bg-background text-foreground" style={{ scrollBehavior: 'smooth' }}>
        <MarketingNav />

        <main className="relative z-10">{children}</main>

        {/* Footer */}
        <footer className="bg-marketing-dark px-[5%] py-12">
          <div className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            {/* Logo */}
            <img src="/POST_TRACKER.svg" alt="Instroom Post Tracker" className="h-16 w-auto brightness-0 invert" />

            {/* Links — absolutely centered */}
            <div className="absolute left-1/2 flex -translate-x-1/2 flex-wrap gap-6">
              <a href="#" className="text-[0.8rem] text-white/35 transition-colors hover:text-white/60">
                Privacy policy
              </a>
              <a href="#" className="text-[0.8rem] text-white/35 transition-colors hover:text-white/60">
                Terms of service
              </a>
              <a href="#" className="text-[0.8rem] text-white/35 transition-colors hover:text-white/60">
                Support
              </a>
            </div>

            {/* Copyright */}
            <p className="text-[0.78rem] text-white/25">
              © {new Date().getFullYear()} Instroom. Built by Armful Media.
            </p>
          </div>
        </footer>

        <ContactModal />
      </div>
    </MarketingContactProvider>
  )
}
