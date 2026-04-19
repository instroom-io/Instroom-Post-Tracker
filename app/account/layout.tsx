import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-6 py-4">
        <Link href="/app">
          <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={130} height={30} priority />
        </Link>
      </div>
      <div className="mx-auto max-w-lg px-6 py-16">
        {children}
      </div>
      <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="afterInteractive" />
    </div>
  )
}
