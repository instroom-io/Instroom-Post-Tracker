import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { AcceptInviteButton } from './accept-invite-button'
import Link from 'next/link'
import Image from 'next/image'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params
  const serviceClient = createServiceClient()

  const { data: invitation } = await serviceClient
    .from('invitations')
    .select('*, workspaces(name)')
    .eq('token', token)
    .maybeSingle()

  if (!invitation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="font-display text-[22px] font-extrabold text-foreground mb-2">
            Invalid invitation
          </h1>
          <p className="text-[13px] text-foreground-lighter">
            This invitation link is invalid or has expired.
          </p>
        </div>
      </div>
    )
  }

  if (invitation.accepted_at || new Date(invitation.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">⏰</div>
          <h1 className="font-display text-[22px] font-extrabold text-foreground mb-2">
            Invitation expired
          </h1>
          <p className="text-[13px] text-foreground-lighter">
            This invitation has already been used or has expired.
          </p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const workspace = invitation.workspaces as { name: string } | null

  // Email mismatch — logged in as wrong account
  if (user && user.email !== invitation.email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <div className="flex justify-center mb-4">
              <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={180} height={40} priority />
            </div>
            <h1 className="font-display text-[22px] font-extrabold text-foreground mb-1">
              Wrong account
            </h1>
            <p className="text-[13px] text-foreground-lighter">
              This invitation was sent to{' '}
              <strong className="text-foreground">{invitation.email}</strong>.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background-surface p-6 shadow-sm flex flex-col gap-3">
            <p className="text-[12px] text-foreground-lighter text-center">
              You&apos;re signed in as <strong className="text-foreground">{user.email}</strong>.
              Please sign out and sign in with the correct account to accept this invitation.
            </p>
            <Link
              href={`/login?redirectTo=/invite/${token}`}
              className="flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand/90"
            >
              Sign in with correct account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={180} height={40} priority />
          </div>
          <h1 className="font-display text-[22px] font-extrabold text-foreground mb-2">
            You've been invited
          </h1>
          <p className="text-[13px] text-foreground-lighter mb-6">
            You've been invited to join{' '}
            <strong className="text-foreground">{workspace?.name}</strong> as{' '}
            <strong className="text-foreground">{invitation.role}</strong>.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href={`/login?redirectTo=/invite/${token}`}
              className="flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand/90"
            >
              Sign in to accept
            </Link>
            <Link
              href={`/signup?redirectTo=/invite/${token}`}
              className="flex h-10 items-center justify-center rounded-lg border border-border bg-background-surface px-4 text-[12px] font-medium text-foreground transition-colors hover:bg-background-muted"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="flex justify-center mb-4">
            <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={180} height={40} priority />
          </div>
          <h1 className="font-display text-[22px] font-extrabold text-foreground mb-1">
            Accept invitation
          </h1>
          <p className="text-[13px] text-foreground-lighter">
            You've been invited to join{' '}
            <strong className="text-foreground">{workspace?.name}</strong> as{' '}
            <strong className="text-foreground">{invitation.role}</strong>.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background-surface p-6 shadow-sm">
          <AcceptInviteButton token={token} />
        </div>
      </div>
    </div>
  )
}
