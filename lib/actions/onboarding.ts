'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { onboardingAnswersSchema } from '@/lib/validations'
import type { OnboardingAnswers } from '@/lib/validations'

export async function completeOnboarding(
  answers: OnboardingAnswers
): Promise<{ error: string } | void> {
  const parsed = onboardingAnswersSchema.safeParse(answers)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Store answers in auth user metadata
  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      referral_source: parsed.data.referral_source,
      agency_size: parsed.data.agency_size,
      platforms: parsed.data.platforms,
      main_challenge: parsed.data.main_challenge,
    },
  })

  if (metaError) return { error: 'Failed to save onboarding answers.' }

  // Mark onboarding as complete
  const { error: dbError } = await supabase
    .from('users')
    .update({ onboarding_completed: true })
    .eq('id', user.id)

  if (dbError) return { error: 'Failed to complete onboarding.' }

  revalidatePath('/app')
}
