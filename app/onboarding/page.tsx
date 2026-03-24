import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingForm } from './onboarding-form'

export default async function OnboardingPage() {
  if (process.env.NODE_ENV !== 'development') {
    redirect('/login')
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // If user already has a workspace, redirect to it
  const { data: memberships } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(slug)')
    .eq('user_id', user.id)
    .limit(1)

  if (memberships && memberships.length > 0) {
    const workspace = memberships[0].workspaces as unknown as { slug: string } | null
    if (workspace?.slug) {
      redirect(`/${workspace.slug}/overview`)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={180} height={40} priority />
          </div>
          <h1 className="font-display text-[22px] font-extrabold text-foreground">
            Create your workspace
          </h1>
          <p className="mt-1 text-[13px] text-foreground-lighter">
            Set up your first brand workspace to start tracking campaigns.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background-surface p-6 shadow-sm">
          <OnboardingForm />
        </div>
      </div>
    </div>
  )
}
