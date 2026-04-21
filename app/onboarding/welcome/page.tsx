import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWelcome } from './onboarding-welcome'

export default async function OnboardingWelcomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (profile?.onboarding_completed) redirect('/app')

  // Team owner → 4-question flow
  const { data: agency } = await supabase
    .from('agencies')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (agency) return <OnboardingWelcome accountType="team" />

  // Solo workspace owner → 3-question flow (no agency_size)
  const { data: ownerRow } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()

  if (ownerRow) return <OnboardingWelcome accountType="solo" />

  // Invited member / unknown state — skip onboarding
  redirect('/app')
}
