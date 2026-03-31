import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWelcome } from './onboarding-welcome'

export default async function OnboardingWelcomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if already completed onboarding
  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (profile?.onboarding_completed) redirect('/app')

  // Only agency owners see this flow (DB check, works for all signup methods)
  const { data: agency } = await supabase
    .from('agencies')
    .select('id')
    .eq('owner_id', user.id)
    .eq('status', 'active')
    .maybeSingle()
  if (!agency) redirect('/app')

  return <OnboardingWelcome />
}
