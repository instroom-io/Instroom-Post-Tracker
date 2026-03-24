import Image from 'next/image'
import { createServiceClient } from '@/lib/supabase/server'
import { AcceptInviteForm } from './accept-invite-form'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function BrandInvitePage({ params }: PageProps) {
  const { token } = await params
  const serviceClient = createServiceClient()

  const { data: invite } = await serviceClient
    .from('brand_requests')
    .select('id, brand_name, contact_email, status, invite_token_expires_at, agencies(name)')
    .eq('invite_token', token)
    .single()

  if (!invite || invite.status !== 'invited') {
    return <InviteError message="This invitation link is invalid or has already been used." />
  }

  const isExpired =
    invite.invite_token_expires_at &&
    new Date(invite.invite_token_expires_at) < new Date()

  if (isExpired) {
    return <InviteError message="This invitation link has expired. Please ask your agency to send a new one." />
  }

  const agencyName = Array.isArray(invite.agencies)
    ? (invite.agencies[0] as { name: string } | null)?.name
    : (invite.agencies as { name: string } | null)?.name

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mx-auto mb-6 flex justify-center">
          <Image
            src="/POST_TRACKER.svg"
            alt="Instroom Post Tracker"
            width={180}
            height={40}
            priority
          />
        </div>

        <div className="rounded-xl border border-border bg-background-surface p-8 shadow-sm">
          <div className="mb-5 text-center">
            <h1 className="font-display text-[18px] font-extrabold text-foreground">
              You've been invited
            </h1>
            <p className="mt-2 text-[13px] text-foreground-lighter leading-relaxed">
              {agencyName ? (
                <>
                  <strong className="text-foreground">{agencyName}</strong> has invited{' '}
                  <strong className="text-foreground">{invite.brand_name}</strong> to connect on
                  Instroom Post Tracker.
                </>
              ) : (
                <>
                  Your brand <strong className="text-foreground">{invite.brand_name}</strong> has
                  been invited to connect on Instroom Post Tracker.
                </>
              )}
            </p>
            <p className="mt-2 text-[12px] text-foreground-muted">
              Fill in your details below to get started.
            </p>
          </div>

          <AcceptInviteForm token={token} />
        </div>
      </div>
    </div>
  )
}

function InviteError({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex justify-center">
          <Image
            src="/POST_TRACKER.svg"
            alt="Instroom Post Tracker"
            width={180}
            height={40}
            priority
          />
        </div>
        <div className="rounded-xl border border-border bg-background-surface p-8 shadow-sm">
          <h1 className="font-display text-[18px] font-extrabold text-foreground">
            Link unavailable
          </h1>
          <p className="mt-2 text-[13px] text-foreground-lighter leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  )
}
