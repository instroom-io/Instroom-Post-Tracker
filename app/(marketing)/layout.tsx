'use client'

import Link from 'next/link'
import { MarketingContactProvider, useMarketingContact } from '@/components/marketing/marketing-contact-provider'
import { MarketingNav } from '@/components/marketing/marketing-nav'
import { ContactModal } from '@/components/marketing/contact-modal'

function FooterCta() {
  const { setOpen } = useMarketingContact()
  return (
    <button
      onClick={() => setOpen(true)}
      className="bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand/90 hover:shadow-[0_0_20px_rgba(31,174,91,0.4)] transition-all"
    >
      Contact Us
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
      <div className="min-h-screen overflow-x-hidden bg-[#091810] text-white" style={{ scrollBehavior: 'smooth' }}>
        <MarketingNav />

        <main className="relative z-10">{children}</main>

        {/* Footer */}
        <footer className="relative z-10 border-t border-brand/10">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
              {/* Wordmark + tagline */}
              <div>
                <Link href="/" className="flex items-center gap-1.5">
                  <span className="rounded bg-brand-dark px-1.5 py-0.5 text-xs font-bold text-brand">
                    in
                  </span>
                  <span className="font-display font-bold text-white/70">
                    instroom
                  </span>
                </Link>
                <p className="mt-3 max-w-xs text-sm text-white/40">
                  Automated post tracking, content downloads, and performance
                  measurement for influencer marketing agencies.
                </p>
              </div>

              {/* Nav columns */}
              <div className="grid grid-cols-3 gap-6 text-sm">
                <div>
                  <h4 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-white/60">
                    Product
                  </h4>
                  <ul className="space-y-2">
                    <li>
                      <a href="#features" className="text-white/40 hover:text-brand transition-colors">
                        Features
                      </a>
                    </li>
                    <li>
                      <a href="#pricing" className="text-white/40 hover:text-brand transition-colors">
                        Pricing
                      </a>
                    </li>
                    <li>
                      <a href="#faq" className="text-white/40 hover:text-brand transition-colors">
                        FAQ
                      </a>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-white/60">
                    Company
                  </h4>
                  <ul className="space-y-2">
                    <li>
                      <Link href="/login" className="text-white/40 hover:text-brand transition-colors">
                        Sign in
                      </Link>
                    </li>
                    <li>
                      <Link href="/signup" className="text-white/40 hover:text-brand transition-colors">
                        Sign up
                      </Link>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-white/60">
                    Platforms
                  </h4>
                  <ul className="space-y-2">
                    <li className="text-white/40">Instagram</li>
                    <li className="text-white/40">TikTok</li>
                    <li className="text-white/40">YouTube</li>
                  </ul>
                </div>
              </div>

              {/* CTA */}
              <div className="flex flex-col items-start md:items-end justify-start gap-4">
                <FooterCta />
                <p className="text-xs text-white/30">
                  Ready to automate your influencer tracking?
                </p>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-12 border-t border-white/5 pt-6 text-center">
              <p className="text-xs text-white/30">
                © {new Date().getFullYear()} Instroom. All rights reserved.
              </p>
            </div>
          </div>
        </footer>

        <ContactModal />
      </div>
    </MarketingContactProvider>
  )
}
