'use client'

import Link from 'next/link'
import { MarketingContactProvider, useMarketingContact } from '@/components/marketing/marketing-contact-provider'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { ContactModal } from '@/components/marketing/contact-modal'
import { ThemeSwitcher } from '@/components/marketing/theme-switcher'

function SupportButton() {
  const { setOpen } = useMarketingContact()
  return (
    <button
      onClick={() => setOpen(true)}
      className="text-[0.8rem] text-white/55 transition-colors hover:text-white/80"
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
        <footer className="bg-marketing-dark px-[5%] py-14">
          <div className="mx-auto max-w-7xl">
            {/* Top row: logo + product nav */}
            <div className="mb-10 flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/POST_TRACKER.svg" alt="Instroom Post Tracker" className="h-10 w-auto brightness-0 invert" />
              <div className="flex flex-wrap gap-x-8 gap-y-3">
                {(
                  [
                    ['#features', 'Features'],
                    ['#how-it-works', 'How It Works'],
                    ['#pricing', 'Pricing'],
                    ['#faq', 'FAQ'],
                  ] as const
                ).map(([href, label]) => (
                  <a
                    key={href}
                    href={href}
                    className="text-[0.8rem] font-medium text-white/55 transition-colors hover:text-white/80"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>

            {/* Bottom row: legal + copyright */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-6">
              <div className="flex flex-wrap gap-5">
                <Link href="/privacy" className="text-[0.75rem] text-white/55 transition-colors hover:text-white/80">
                  Privacy policy
                </Link>
                <Link href="/terms" className="text-[0.75rem] text-white/55 transition-colors hover:text-white/80">
                  Terms of service
                </Link>
                <SupportButton />
              </div>
              <div className="flex items-center gap-4">
                <ThemeSwitcher />
                <p className="text-[0.75rem] text-white/20">
                  © {new Date().getFullYear()} Instroom Post Tracker. Built by Armful Media.
                </p>
              </div>
            </div>
          </div>
        </footer>

        <ContactModal />
      </div>
    </MarketingContactProvider>
  )
}
