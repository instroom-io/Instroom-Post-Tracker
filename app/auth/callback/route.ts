import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
    if (!error) return redirectTo(next)
  }

  // Email OTP / magic link verification
  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) return redirectTo(next)
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
