import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { toSlug, deduplicateSlug } from '@/lib/utils'
import type { EmailOtpType, User } from '@supabase/supabase-js'

function makeRedirect(request: NextRequest, path: string): NextResponse {
  const { origin } = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'
  if (isLocalEnv) return NextResponse.redirect(`${origin}${path}`)
  if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${path}`)
  return NextResponse.redirect(`${origin}${path}`)
}

/**
 * Runs after every successful auth event (OAuth exchange OR email OTP verify).
 * - Upserts the public.users row.
 * - Ensures platform admin flag is set for the admin email.
 * - For new users: auto-creates a workspace based on user_metadata,
 *   then redirects to the correct dashboard.
 * - For returning users: returns null (caller falls through to normal redirect).
 */
async function handlePostAuth(
  user: User,
  request: NextRequest
): Promise<NextResponse | null> {
  const serviceClient = createServiceClient()

  // 1. Ensure public.users row always exists (DB trigger may fail silently)
  // When a Google identity is linked, Supabase stores the avatar in identity_data
  // but does NOT automatically merge it into user_metadata — so we do it here.
  const googleIdentity = user.identities?.find((i) => i.provider === 'google')
  const googleAvatarUrl = (googleIdentity?.identity_data as { avatar_url?: string } | undefined)?.avatar_url ?? null
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? googleAvatarUrl

  await serviceClient.from('users').upsert(
    {
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name ?? null,
      avatar_url: avatarUrl,
    },
    { onConflict: 'id', ignoreDuplicates: false }
  )

  // Persist Google avatar into user_metadata so getUser() returns it on future calls
  if (googleAvatarUrl && !user.user_metadata?.avatar_url) {
    await serviceClient.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, avatar_url: googleAvatarUrl },
    })
  }

  // 2. Platform admin: always ensure flag is set
  const adminEmail = process.env.ADMIN_EMAIL
  const email = user.email!
  const isAdmin = adminEmail && email.toLowerCase() === adminEmail.toLowerCase()

  if (isAdmin) {
    await serviceClient.from('users').update({ is_platform_admin: true }).eq('id', user.id)
    return null // Admin uses normal /app dispatcher
  }

  // Honour an explicit next param (e.g. /account/settings after identity linking)
  const returnTo = (() => {
    const n = new URL(request.url).searchParams.get('next')
    return n && n.startsWith('/') ? n : null
  })()

  // 3. Returning solo user who owns a workspace → redirect there directly
  const { data: existingMember } = await serviceClient
    .from('workspace_members')
    .select('workspace_id, workspaces(slug)')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .maybeSingle()

  if (existingMember) {
    if (returnTo) return makeRedirect(request, returnTo)
    const slug = (existingMember.workspaces as unknown as { slug: string }).slug
    return makeRedirect(request, `/${slug}/overview`)
  }

  // Returning team user with an existing agency → route through /app dispatcher
  const { data: existingAgency } = await serviceClient
    .from('agencies')
    .select('slug')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (existingAgency) {
    if (returnTo) return makeRedirect(request, returnTo)
    return makeRedirect(request, '/app')
  }

  // Returning invited member (non-owner role) — already belongs to a workspace,
  // must not create a new one (e.g. when linking Google OAuth from account settings).
  const { data: existingAnyMembership } = await serviceClient
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingAnyMembership) {
    if (returnTo) return makeRedirect(request, returnTo)
    return makeRedirect(request, '/app')
  }

  // 4. No workspace/agency yet — new user flow

  // Invited members don't need their own workspace/agency — send them to accept the invite.
  // This must run before workspace creation so we don't create an unwanted workspace for
  // someone who is only here to join an existing one (regardless of whether they filled
  // in an account_name on the signup form).
  if (returnTo?.startsWith('/invite/')) {
    return makeRedirect(request, returnTo)
  }

  const { account_name: metaAccountName, account_type, website_url } = user.user_metadata ?? {}

  // For Google OAuth: account_name may be in the callback URL instead of user_metadata
  const urlAccountName = new URL(request.url).searchParams.get('account_name')
  const account_name = metaAccountName ?? (urlAccountName?.trim() || null)

  // Still no name → redirect to name collection (fallback for direct OAuth without signup form)
  if (!account_name || account_name.length < 2) {
    const hintType = new URL(request.url).searchParams.get('account_type')
    const onboardingPath = hintType ? `/onboarding/name?type=${hintType}` : '/onboarding/name'
    return makeRedirect(request, onboardingPath)
  }

  // Persist name to user_metadata if it came from the URL (so future logins skip this check)
  if (!metaAccountName && urlAccountName) {
    await serviceClient.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, account_name: account_name.trim() },
    })
  }

  const base = toSlug(account_name as string)

  if (account_type === 'team') {
    // Team accounts: create agency only — workspaces are for brands
    const { data: takenAgencyRows } = await serviceClient
      .from('agencies')
      .select('slug')
      .ilike('slug', `${base}%`)
    const agencySlug = deduplicateSlug(base, takenAgencyRows?.map((r) => r.slug) ?? [])

    let logoUrl: string | null = null
    if (website_url) {
      try {
        const domain = new URL(website_url as string).hostname
        logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
      } catch { /* invalid URL — ignore */ }
    }

    await serviceClient.from('agencies').insert({
      name: account_name as string,
      slug: agencySlug,
      owner_id: user.id,
      status: 'active',
      ...(logoUrl ? { logo_url: logoUrl } : {}),
    })

    // Route through /app so the onboarding welcome survey fires for new team users
    return makeRedirect(request, '/app')
  }

  // Solo: create workspace
  const trialStartedAt = new Date()
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  const { data: takenRows } = await serviceClient
    .from('workspaces')
    .select('slug')
    .ilike('slug', `${base}%`)

  const workspaceSlug = deduplicateSlug(base, takenRows?.map((r) => r.slug) ?? [])

  let soloLogoUrl: string | null = null
  if (website_url) {
    try {
      const domain = new URL(website_url as string).hostname
      soloLogoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    } catch { /* invalid URL — ignore */ }
  }

  const { data: ws } = await serviceClient
    .from('workspaces')
    .insert({
      name: account_name,
      slug: workspaceSlug,
      plan: 'trial',
      trial_started_at: trialStartedAt.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      account_type: 'solo',
      workspace_quota: 1,
      ...(soloLogoUrl ? { logo_url: soloLogoUrl } : {}),
    })
    .select('id')
    .single()

  if (!ws) return makeRedirect(request, '/onboarding/name')

  await serviceClient.from('workspace_members').insert({
    workspace_id: ws.id,
    user_id: user.id,
    role: 'owner',
  })

  return makeRedirect(request, `/${workspaceSlug}/overview`)
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/app'

  // OAuth / PKCE code exchange (Google, etc.)
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const response = await handlePostAuth(user, request)
        if (response) return response
      }

      return makeRedirect(request, next)
    }
  }

  // Email OTP / magic link verification
  if (token_hash && type) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.verifyOtp({ token_hash, type })

    if (!error) {
      if (data.user) {
        const response = await handlePostAuth(data.user, request)
        if (response) return response
      }
      return makeRedirect(request, next)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
