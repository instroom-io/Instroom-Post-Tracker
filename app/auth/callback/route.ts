import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/app'

  const redirectTo = (path: string) => {
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'
    if (isLocalEnv) return NextResponse.redirect(`${origin}${path}`)
    if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${path}`)
    return NextResponse.redirect(`${origin}${path}`)
  }

  // OAuth / PKCE code exchange
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // For new OAuth users, enforce the invite-only gate
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Detect new user: created_at and last_sign_in_at are within 10 seconds
        const createdAt = new Date(user.created_at).getTime()
        const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : createdAt
        const isNewUser = Math.abs(createdAt - lastSignIn) < 10000

        if (isNewUser) {
          const adminEmail = process.env.ADMIN_EMAIL
          const email = user.email!
          const isAdmin = adminEmail && email.toLowerCase() === adminEmail.toLowerCase()

          if (!isAdmin) {
            const serviceClient = createServiceClient()

            const [{ data: invite }, { data: agencyRequest }, { data: brandRequest }] = await Promise.all([
              serviceClient.from('invitations').select('id')
                .eq('email', email).is('accepted_at', null)
                .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
                .maybeSingle(),
              serviceClient.from('agency_requests').select('id')
                .eq('contact_email', email).in('status', ['pending', 'approved'])
                .maybeSingle(),
              serviceClient.from('brand_requests').select('id')
                .eq('contact_email', email).in('status', ['invited', 'approved'])
                .maybeSingle(),
            ])

            if (!invite && !agencyRequest && !brandRequest) {
              await supabase.auth.signOut()
              return redirectTo('/request-access?error=invite_only')
            }

            // Claim agency ownership if this user is the approved agency contact
            if (agencyRequest) {
              const { data: approvedRequest } = await serviceClient
                .from('agency_requests')
                .select('agency_name')
                .eq('contact_email', email)
                .eq('status', 'approved')
                .maybeSingle()

              if (approvedRequest) {
                const { toSlug } = await import('@/lib/utils')
                const slug = toSlug(approvedRequest.agency_name)
                await serviceClient
                  .from('agencies')
                  .update({ owner_id: user.id })
                  .eq('slug', slug)
                  .or('owner_id.is.null,owner_id.neq.' + user.id)
              }
            }
          }
        }
      }

      return redirectTo(next)
    }
  }

  // Email OTP / magic link verification
  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) return redirectTo(next)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
