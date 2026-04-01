import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { ThemeToggle } from '@/components/layout/theme-toggle'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex h-14 items-center justify-between border-b border-border px-6">
        <Link href="/app" className="opacity-100 transition-opacity hover:opacity-75">
          <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={140} height={32} priority />
        </Link>
        <ThemeToggle />
      </div>
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">{children}</main>
    </div>
  )
}
