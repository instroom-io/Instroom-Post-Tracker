import Image from 'next/image'
import Link from 'next/link'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/">
            <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={140} height={28} className="brightness-0 dark:invert" />
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-[12px] font-medium text-foreground-lighter hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-8 items-center rounded-lg bg-brand px-4 text-[12px] font-semibold text-white hover:bg-brand-dark transition-colors"
            >
              Start free trial
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-background-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
          <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={120} height={24} className="brightness-0 dark:invert" />
          <p className="text-[11px] text-foreground-muted">
            © {new Date().getFullYear()} Instroom. All rights reserved.
          </p>
          <div className="flex gap-5">
            <Link
              href="/login"
              className="text-[11px] text-foreground-lighter hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-[11px] text-foreground-lighter hover:text-foreground transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
