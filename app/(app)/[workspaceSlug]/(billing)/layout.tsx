import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

interface BillingLayoutProps {
  children: React.ReactNode
  params: Promise<{ workspaceSlug: string }>
}

export default async function BillingLayout({ children, params }: BillingLayoutProps) {
  const { workspaceSlug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirectTo=/${workspaceSlug}/upgrade`)

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-6 py-4">
        <Link href={`/${workspaceSlug}/overview`}>
          <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={130} height={30} priority />
        </Link>
      </div>
      <div className="mx-auto max-w-lg px-6 py-16">
        {children}
      </div>
    </div>
  )
}
