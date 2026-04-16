import { redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'
import { JoinRequestForm } from './join-request-form'

interface PageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function JoinPage({ params }: PageProps) {
  const { workspaceSlug } = await params
  const serviceClient = createServiceClient()

  // Fetch workspace — public lookup by slug (name + logo only)
  const { data: workspace } = await serviceClient
    .from('workspaces')
    .select('id, name, slug, logo_url')
    .eq('slug', workspaceSlug)
    .maybeSingle()

  if (!workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-6">
            <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={160} height={36} priority />
          </div>
          <h1 className="font-display text-[22px] font-extrabold text-foreground mb-2">
            Workspace not found
          </h1>
          <p className="text-[13px] text-foreground-lighter">
            This join link is invalid or the workspace no longer exists.
          </p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Not logged in — prompt to sign in
  if (!user) {
    const loginUrl = `/login?redirectTo=/join/${workspaceSlug}`
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <div className="flex justify-center mb-4">
              <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={160} height={36} priority />
            </div>
            {workspace.logo_url && (
              <Image
                src={workspace.logo_url}
                alt={workspace.name}
                width={48}
                height={48}
                className="rounded-full mx-auto mb-3 object-cover"
              />
            )}
            <h1 className="font-display text-[22px] font-extrabold text-foreground mb-1">
              Join {workspace.name}
            </h1>
            <p className="text-[13px] text-foreground-lighter">
              Sign in to request access to this workspace.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background-surface p-6 shadow-sm">
            <Link
              href={loginUrl}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-brand px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand/90"
            >
              Sign in to request access
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Check membership and request status via service client (user may not be a member yet)
  const [{ data: existingMember }, { data: existingRequest }] = await Promise.all([
    serviceClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspace.id)
      .eq('user_id', user.id)
      .maybeSingle(),
    serviceClient
      .from('workspace_join_requests')
      .select('status')
      .eq('workspace_id', workspace.id)
      .eq('requester_id', user.id)
      .maybeSingle(),
  ])

  // Owner — go straight to workspace
  if (existingMember?.role === 'owner') {
    redirect(`/${workspace.slug}/overview`)
  }

  // Already a member
  if (existingMember) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-6">
            <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={160} height={36} priority />
          </div>
          <h1 className="font-display text-[22px] font-extrabold text-foreground mb-2">
            You&apos;re already a member
          </h1>
          <p className="text-[13px] text-foreground-lighter mb-6">
            You already have access to the{' '}
            <strong className="text-foreground">{workspace.name}</strong> workspace.
          </p>
          <Link
            href={`/${workspace.slug}/overview`}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-6 text-[13px] font-semibold text-white transition-colors hover:bg-brand/90"
          >
            Open workspace
          </Link>
        </div>
      </div>
    )
  }

  // Already has a pending request
  if (existingRequest?.status === 'pending') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-6">
            <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={160} height={36} priority />
          </div>
          <h1 className="font-display text-[22px] font-extrabold text-foreground mb-2">
            Request pending
          </h1>
          <p className="text-[13px] text-foreground-lighter">
            Your request to join{' '}
            <strong className="text-foreground">{workspace.name}</strong> is pending review.
            You&apos;ll receive an email once the Admin has reviewed it.
          </p>
        </div>
      </div>
    )
  }

  // Show the request form
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="flex justify-center mb-4">
            <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={160} height={36} priority />
          </div>
          {workspace.logo_url && (
            <Image
              src={workspace.logo_url}
              alt={workspace.name}
              width={48}
              height={48}
              className="rounded-full mx-auto mb-3 object-cover"
            />
          )}
          <h1 className="font-display text-[22px] font-extrabold text-foreground mb-1">
            Join {workspace.name}
          </h1>
          <p className="text-[13px] text-foreground-lighter">
            Request access — the workspace Admin will review and approve.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background-surface p-6 shadow-sm">
          <JoinRequestForm workspaceId={workspace.id} workspaceName={workspace.name} />
        </div>
      </div>
    </div>
  )
}
