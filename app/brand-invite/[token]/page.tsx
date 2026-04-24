import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { BrandOnboardForm } from './brand-onboard-form'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function BrandInvitePage({ params }: PageProps) {
  const { token } = await params
  const serviceClient = createServiceClient()

  const { data: invite } = await serviceClient
    .from('brand_invites')
    .select('workspace_name, email, expires_at, accepted_at')
    .eq('token', token)
    .maybeSingle()

  const shell = (children: React.ReactNode) => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="mb-8">
        <Image src="/POST_TRACKER.svg" alt="Instroom" width={140} height={32} priority />
      </Link>
      <div className="w-full max-w-sm">
        {children}
      </div>
    </div>
  )

  if (!invite) {
    return shell(
      <div className="text-center">
        <h1 className="font-display text-[22px] font-extrabold text-foreground mb-2">
          Invalid link
        </h1>
        <p className="text-[13px] text-foreground-lighter">
          This invite link is invalid or has expired.
        </p>
      </div>
    )
  }

  if (invite.accepted_at) {
    return shell(
      <div className="text-center">
        <h1 className="font-display text-[22px] font-extrabold text-foreground mb-2">
          Already submitted
        </h1>
        <p className="text-[13px] text-foreground-lighter">
          This invite has already been completed.
        </p>
      </div>
    )
  }

  if (new Date(invite.expires_at) < new Date()) {
    return shell(
      <div className="text-center">
        <h1 className="font-display text-[22px] font-extrabold text-foreground mb-2">
          Link expired
        </h1>
        <p className="text-[13px] text-foreground-lighter">
          This invite link has expired. Please contact the agency for a new one.
        </p>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const { data: existingUser } = await serviceClient
      .from('users')
      .select('id')
      .eq('email', invite.email)
      .maybeSingle()
    if (existingUser) {
      redirect(`/login?redirectTo=/brand-invite/${token}`)
    } else {
      redirect(`/signup?redirectTo=/brand-invite/${token}`)
    }
  }

  if (user.email !== invite.email) {
    return shell(
      <div>
        <div className="mb-6 text-center">
          <h1 className="font-display text-[22px] font-extrabold text-foreground mb-1">
            Wrong account
          </h1>
          <p className="text-[13px] text-foreground-lighter">
            This invitation was sent to{' '}
            <strong className="text-foreground">{invite.email}</strong>.
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background-surface p-6 shadow-sm flex flex-col gap-3">
          <p className="text-[12px] text-foreground-lighter text-center">
            You&apos;re signed in as <strong className="text-foreground">{user.email}</strong>.
            Please sign in with the correct account to accept this invitation.
          </p>
          <Link
            href={`/login?redirectTo=/brand-invite/${token}`}
            className="flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-[12px] font-semibold text-white transition-colors hover:bg-brand/90"
          >
            Sign in with correct account
          </Link>
        </div>
      </div>
    )
  }

  return shell(
    <>
      <div className="mb-6 text-center">
        <h1 className="font-display text-[22px] font-extrabold text-foreground mb-1">
          Complete your brand profile
        </h1>
        <p className="text-[13px] text-foreground-lighter">
          You've been invited to set up{' '}
          <strong className="text-foreground">{invite.workspace_name}</strong> on Instroom Post Tracker.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-background-surface p-6 shadow-sm">
        <BrandOnboardForm token={token} />
      </div>
    </>
  )
}
