import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { AdminNav } from '@/components/admin/admin-nav'

interface LayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: LayoutProps) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_admin) redirect('/app')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex h-14 items-center border-b border-border px-6 gap-6">
        <div className="flex items-center gap-3">
          <Link href="/"><Image src="/POST_TRACKER.svg" alt="Instroom" width={120} height={28} priority /></Link>
          <span className="text-[12px] text-foreground-muted">/</span>
          <span className="text-[13px] font-semibold text-foreground">Admin</span>
        </div>
        <AdminNav />
      </div>
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  )
}
