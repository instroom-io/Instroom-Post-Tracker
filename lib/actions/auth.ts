'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { signInSchema, signUpSchema } from '@/lib/validations'

export async function signIn(
  _prevState: unknown,
  formData: FormData
): Promise<{ error: string } | void> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error) {
    return { error: 'Invalid email or password.' }
  }

  const redirectTo = formData.get('redirectTo')
  const destination = typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : '/app'

  revalidatePath('/', 'layout')
  redirect(destination)
}

export async function signUp(
  _prevState: unknown,
  formData: FormData
): Promise<{ error: string } | { success: true; email: string } | void> {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    full_name: formData.get('full_name'),
  })

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message }
  }

  // Invite-only gate: only admin email or users with a valid access path can sign up
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || parsed.data.email.toLowerCase() !== adminEmail.toLowerCase()) {
    const serviceClient = createServiceClient()
    const email = parsed.data.email

    // Check 1: pending workspace invitation
    const { data: invite } = await serviceClient
      .from('invitations')
      .select('id')
      .eq('email', email)
      .is('accepted_at', null)
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .maybeSingle()

    // Check 2: pending or approved agency request (agency contact signing up before/after approval)
    const { data: agencyRequest } = await serviceClient
      .from('agency_requests')
      .select('id')
      .eq('contact_email', email)
      .in('status', ['pending', 'approved'])
      .maybeSingle()

    // Check 3: invited or approved brand request (agency-initiated invite OR request-approval flow)
    const { data: brandRequest } = await serviceClient
      .from('brand_requests')
      .select('id')
      .eq('contact_email', email)
      .in('status', ['invited', 'approved'])
      .maybeSingle()

    if (!invite && !agencyRequest && !brandRequest) {
      return { error: 'Sign-up is by invitation only. Please use the invite link sent to your email.' }
    }
  }

  const redirectTo = formData.get('redirectTo')
  const nextPath = typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : '/app'
  const emailRedirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(nextPath)}`

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.full_name,
      },
      emailRedirectTo,
    },
  })

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('already been registered')) {
      return { error: 'An account with this email already exists.' }
    }
    return { error: 'Failed to create account. Please try again.' }
  }

  return { success: true, email: parsed.data.email }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
