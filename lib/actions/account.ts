'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { updatePreferencesSchema, updatePasswordSchema } from '@/lib/validations'

export async function updatePreferences(data: {
  preferred_language: string
  timezone: string
}): Promise<{ error: string } | void> {
  const parsed = updatePreferencesSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('users')
    .update({
      preferred_language: parsed.data.preferred_language,
      timezone: parsed.data.timezone,
    })
    .eq('id', user.id)

  if (error) return { error: 'Failed to update preferences.' }

  revalidatePath('/account/settings')
}

export async function updatePassword(data: {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}): Promise<{ error: string } | void> {
  const parsed = updatePasswordSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: parsed.data.currentPassword,
  })
  if (signInError) return { error: 'Current password is incorrect.' }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  })
  if (updateError) return { error: 'Failed to update password.' }
}
