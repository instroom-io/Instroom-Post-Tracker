import Image from 'next/image'
import Link from 'next/link'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ConfirmButton } from './confirm-button'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function OnboardPage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const serviceClient = createServiceClient()

  // ── Dual-lookup: new request-approval flow first ──────────────────────────
  const { data: brandRequest } = await serviceClient
    .from('brand_requests')
    .select('id, brand_name, contact_name, status, onboard_token_expires_at, onboard_accepted_at')
    .eq('onboard_token', token)
    .single()

  if (brandRequest) {
    // Validate the request-approval token
    const isExpired =
      brandRequest.onboard_token_expires_at &&
      new Date(brandRequest.onboard_token_expires_at) < new Date()
    const isInactive = brandRequest.status !== 'approved'
    const alreadyAccepted = !!brandRequest.onboard_accepted_at

    if (isExpired || isInactive) {
      return <OnboardError message="This onboarding link is invalid or has expired. Please contact your agency." />
    }

    return (
      <OnboardLayout>
        <h1 className="font-display text-[18px] font-extrabold text-foreground">
          Welcome, {brandRequest.contact_name.split(' ')[0]}!
        </h1>
        <p className="mt-2 text-[13px] text-foreground-lighter leading-relaxed">
          Your brand <strong className="text-foreground">{brandRequest.brand_name}</strong> has been
          approved. Your agency is now actively tracking your influencer marketing campaigns.
        </p>

        {alreadyAccepted ? (
          <div className="mt-6 rounded-lg bg-background-subtle px-4 py-3 text-center">
            <p className="text-[13px] font-medium text-foreground">
              ✓ Onboarding already confirmed.
            </p>
            <p className="mt-1 text-[12px] text-foreground-lighter">
              Your agency has everything they need.
            </p>
          </div>
        ) : !user ? (
          <div className="mt-6">
            <Link
              href={`/login?redirectTo=/onboard/${token}`}
              className="inline-block w-full rounded-lg bg-foreground px-4 py-2.5 text-center text-[13px] font-semibold text-background transition-opacity hover:opacity-90"
            >
              Sign in to confirm →
            </Link>
          </div>
        ) : (
          <div className="mt-6">
            <ConfirmButton token={token} />
          </div>
        )}
      </OnboardLayout>
    )
  }

  // ── Fallback: legacy brand_invitations flow ────────────────────────────────
  // brand_invitations has no SELECT RLS policies so service client is required.
  const { data: brandInvitation } = await serviceClient
    .from('brand_invitations')
    .select('id, expires_at, accepted_at, brands(name)')
    .eq('token', token)
    .single()

  if (brandInvitation) {
    const isExpired = new Date(brandInvitation.expires_at) < new Date()
    const alreadyAccepted = !!brandInvitation.accepted_at
    const brand = Array.isArray(brandInvitation.brands)
      ? brandInvitation.brands[0]
      : brandInvitation.brands

    if (isExpired) {
      return <OnboardError message="This onboarding link has expired. Please contact your agency." />
    }

    if (alreadyAccepted) {
      return (
        <OnboardLayout>
          <h1 className="font-display text-[18px] font-extrabold text-foreground">
            Already onboarded
          </h1>
          <p className="mt-2 text-[13px] text-foreground-lighter leading-relaxed">
            {brand?.name && (
              <><strong className="text-foreground">{brand.name}</strong> has already been onboarded.</>
            )}
            {!brand?.name && 'This brand has already been onboarded.'}{' '}
            Contact your agency if you need help.
          </p>
        </OnboardLayout>
      )
    }

    return (
      <OnboardLayout>
        <h1 className="font-display text-[18px] font-extrabold text-foreground">
          {brand?.name ? `Welcome, ${brand.name}!` : 'Brand Onboarding'}
        </h1>
        <p className="mt-2 text-[13px] text-foreground-lighter leading-relaxed">
          Your agency has set up an influencer marketing tracking workspace for you.
          Please contact your agency to proceed — account setup is required for this onboarding link.
        </p>
      </OnboardLayout>
    )
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  return <OnboardError message="This onboarding link is invalid or has expired. Please contact your agency." />
}

// ── Shared layout ──────────────────────────────────────────────────────────────

function OnboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex justify-center">
          <Image
            src="/POST_TRACKER.svg"
            alt="Instroom Post Tracker"
            width={180}
            height={40}
            className="brightness-0 dark:invert"
            priority
          />
        </div>

        <div className="rounded-xl border border-border bg-background-surface p-8 shadow-sm">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background-subtle">
              <svg
                className="h-6 w-6 text-foreground-lighter"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

function OnboardError({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex justify-center">
          <Image
            src="/POST_TRACKER.svg"
            alt="Instroom Post Tracker"
            width={180}
            height={40}
            className="brightness-0 dark:invert"
            priority
          />
        </div>
        <div className="rounded-xl border border-border bg-background-surface p-8 shadow-sm">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background-subtle">
              <svg
                className="h-6 w-6 text-foreground-lighter"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
          </div>
          <h1 className="font-display text-[18px] font-extrabold text-foreground">
            Link unavailable
          </h1>
          <p className="mt-2 text-[13px] text-foreground-lighter leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  )
}
