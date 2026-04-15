import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountSettingsForm } from '@/components/account/account-settings-form'

export default async function AccountSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('preferred_language, timezone, google_connected_email, google_refresh_token, personal_drive_folder_id')
    .eq('id', user.id)
    .single()

  const connectedEmail =
    (profile as unknown as { google_connected_email: string | null } | null)?.google_connected_email ??
    ((profile as unknown as { google_refresh_token: string | null } | null)?.google_refresh_token
      ? user.email ?? 'Connected'
      : null)

  const displayName = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split('@')[0] ?? ''
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null
  const googleLinked = user.identities?.some((i) => i.provider === 'google') ?? false

  return (
    <AccountSettingsForm
      preferredLanguage={profile?.preferred_language ?? 'en'}
      timezone={profile?.timezone ?? 'UTC'}
      displayName={displayName}
      avatarUrl={avatarUrl}
      email={user.email ?? ''}
      connectedEmail={connectedEmail}
      personalDriveFolderId={(profile as unknown as { personal_drive_folder_id: string | null } | null)?.personal_drive_folder_id ?? null}
      googleLinked={googleLinked}
    />
  )
}
