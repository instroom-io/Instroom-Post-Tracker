import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountSettingsForm } from '@/components/account/account-settings-form'

export default async function AccountSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('preferred_language, timezone')
    .eq('id', user.id)
    .single()

  return (
    <AccountSettingsForm
      preferredLanguage={profile?.preferred_language ?? 'en'}
      timezone={profile?.timezone ?? 'UTC'}
    />
  )
}
