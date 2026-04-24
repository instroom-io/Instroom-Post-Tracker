'use client'

import { MarketingContactProvider, useMarketingContact } from '@/components/marketing/marketing-contact-provider'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { ContactModal } from '@/components/marketing/contact-modal'

function SupportButton() {
  const { setOpen } = useMarketingContact()
  return (
    <button
      onClick={() => setOpen(true)}
      className="text-[0.8rem] text-white/35 transition-colors hover:text-white/60"
    >
      Support
    </button>
  )
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MarketingContactProvider>
      <div className="min-h-dvh overflow-x-hidden bg-background text-foreground" style={{ scrollBehavior: 'smooth' }}>
        <MarketingNav />

        <main className="relative z-10">{children}</main>

        {/* Footer */}
        <footer className="bg-marketing-dark px-[5%] py-12">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 md:grid md:grid-cols-[1fr_auto_1fr] md:items-center">
            {/* Logo — left on desktop, centered on mobile */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/POST_TRACKER.svg" alt="Instroom Post Tracker" className="h-16 w-auto brightness-0 invert md:justify-self-start" />

            {/* Links — center column on desktop, centered on mobile */}
            <div className="flex flex-wrap justify-center gap-6">
              <a href="/privacy" className="text-[0.8rem] text-white/35 transition-colors hover:text-white/60">
                Privacy policy
              </a>
              <a href="/terms" className="text-[0.8rem] text-white/35 transition-colors hover:text-white/60">
                Terms of service
              </a>
              <SupportButton />
            </div>

            {/* Copyright — right on desktop, centered on mobile */}
            <p className="text-[0.78rem] text-white/25 md:justify-self-end md:text-right">
              © {new Date().getFullYear()} Instroom. Built by Armful Media.
            </p>
          </div>
        </footer>

        <ContactModal />
      </div>
    </MarketingContactProvider>
  )
}
