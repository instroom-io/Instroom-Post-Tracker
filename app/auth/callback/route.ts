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
  await serviceClient.from('users').upsert(
    {
      id: user.id,
      email: user.email!,
      full_name: user.user_metadata?.full_name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
    },
    { onConflict: 'id', ignoreDuplicates: false }
  )

  // 2. Platform admin: always ensure flag is set
  const adminEmail = process.env.ADMIN_EMAIL
  const email = user.email!
  const isAdmin = adminEmail && email.toLowerCase() === adminEmail.toLowerCase()

  if (isAdmin) {
    await serviceClient.from('users').update({ is_platform_admin: true }).eq('id', user.id)
    return null // Admin uses normal /app dispatcher
  }

  // 3. Detect new user: created_at and last_sign_in_at within 10 seconds
  const createdAt = new Date(user.created_at).getTime()
  const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : createdAt
  const isNewUser = Math.abs(createdAt - lastSignIn) < 10000

  if (!isNewUser) return null // Returning user — /app dispatcher handles routing

  // 4. Auto-create workspace for new users
  const { account_name, account_type } = user.user_metadata ?? {}

  // account_name missing (Google OAuth without pre-filled form) → collect it
  if (!account_name) return makeRedirect(request, '/onboarding/name')

  const workspaceQuota = account_type === 'solo' ? 1 : 3
  const trialStartedAt = new Date()
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  // Idempotent: if workspace already exists for this owner, just redirect
  const { data: existingMember } = await serviceClient
    .from('workspace_members')
    .select('workspace_id, workspaces(slug)')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .maybeSingle()

  if (existingMember) {
    const slug = (existingMember.workspaces as unknown as { slug: string }).slug
    return makeRedirect(request, `/${slug}/overview`)
  }

  const base = toSlug(account_name as string)
  const { data: takenRows } = await serviceClient
    .from('workspaces')
    .select('slug')
    .ilike('slug', `${base}%`)

  const workspaceSlug = deduplicateSlug(base, takenRows?.map((r) => r.slug) ?? [])

  const { data: ws } = await serviceClient
    .from('workspaces')
    .insert({
      name: account_name,
      slug: workspaceSlug,
      plan: 'trial',
      trial_started_at: trialStartedAt.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      account_type: account_type ?? 'team',
      workspace_quota: workspaceQuota,
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
