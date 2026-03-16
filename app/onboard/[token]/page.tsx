import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getBrandInvitation, acceptBrandInvitation } from '@/lib/actions/brands'
import { Button } from '@/components/ui/button'

interface PageProps {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}

export default async function OnboardPage({ params, searchParams }: PageProps) {
  const { token } = await params
  const { error: acceptError } = await searchParams

  const invitation = await getBrandInvitation(token)

  if (!invitation) {
    return <OnboardError message="This invitation link is invalid or does not exist." />
  }

  if (invitation.accepted_at) {
    return <OnboardError message="This invitation has already been accepted. Please sign in to access your workspace." />
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return <OnboardError message="This invitation link has expired. Please contact your agency for a new link." />
  }

  const brand = Array.isArray(invitation.brands) ? invitation.brands[0] : invitation.brands
  if (!brand || brand.status !== 'pending') {
    return <OnboardError message="This brand has already been onboarded." />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <OnboardLayout>
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col gap-1">
            <p className="text-[12px] font-medium uppercase tracking-wider text-foreground-muted">You've been invited to</p>
            <h1 className="font-display text-[28px] font-bold text-foreground">{brand.name}</h1>
          </div>
          <p className="max-w-sm text-[14px] text-foreground-lighter">
            Sign in or create an account to accept this invitation and access your workspace.
          </p>
          <div className="flex gap-3">
            <Link href={`/login?redirectTo=/onboard/${token}`}>
              <Button variant="primary" size="md">Sign in</Button>
            </Link>
            <Link href={`/signup?redirectTo=/onboard/${token}`}>
              <Button variant="secondary" size="md">Create account</Button>
            </Link>
          </div>
        </div>
      </OnboardLayout>
    )
  }

  async function accept() {
    'use server'
    const result = await acceptBrandInvitation(token)
    if ('workspaceSlug' in result) {
      redirect(`/${result.workspaceSlug}/overview`)
    } else {
      redirect(`/onboard/${token}?error=${encodeURIComponent(result.error)}`)
    }
  }

  return (
    <OnboardLayout>
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-1">
          <p className="text-[12px] font-medium uppercase tracking-wider text-foreground-muted">You've been invited to join</p>
          <h1 className="font-display text-[28px] font-bold text-foreground">{brand.name}</h1>
        </div>
        <p className="max-w-sm text-[14px] text-foreground-lighter">
          Clicking below will create your workspace and set you as the owner.
        </p>
        {acceptError && (
          <p className="text-[13px] text-destructive">{decodeURIComponent(acceptError)}</p>
        )}
        <form action={accept}>
          <Button type="submit" variant="primary" size="md">
            Accept & Enter Workspace
          </Button>
        </form>
      </div>
    </OnboardLayout>
  )
}

function OnboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="mb-8">
        <span className="font-display text-[18px] font-bold text-foreground">[in] instroom</span>
      </div>
      <div className="w-full max-w-md rounded-2xl border border-border bg-background-surface p-10 shadow-sm">
        {children}
      </div>
    </div>
  )
}

function OnboardError({ message }: { message: string }) {
  return (
    <OnboardLayout>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-4xl">🔗</div>
        <h1 className="font-display text-[20px] font-bold text-foreground">Invalid Link</h1>
        <p className="text-[14px] text-foreground-lighter">{message}</p>
        <Link href="/login">
          <Button variant="secondary" size="md">Go to sign in</Button>
        </Link>
      </div>
    </OnboardLayout>
  )
}
