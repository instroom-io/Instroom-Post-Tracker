import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountSettingsForm } from '@/components/account/account-settings-form'
import { GoogleDriveCard } from '@/components/account/google-drive-card'

export default async function AccountSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('preferred_language, timezone, google_connected_email, google_refresh_token')
    .eq('id', user.id)
    .single()

  const connectedEmail =
    (profile as unknown as { google_connected_email: string | null } | null)?.google_connected_email ??
    ((profile as unknown as { google_refresh_token: string | null } | null)?.google_refresh_token
      ? user.email ?? 'Connected'
      : null)

  return (
    <div className="space-y-5">
      <AccountSettingsForm
        preferredLanguage={profile?.preferred_language ?? 'en'}
        timezone={profile?.timezone ?? 'UTC'}
      />
      <GoogleDriveCard connectedEmail={connectedEmail} />
    </div>
  )
}
