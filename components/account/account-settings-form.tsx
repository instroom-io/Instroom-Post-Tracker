'use client'

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { updatePreferences, updatePassword, updateProfile, unlinkGoogleIdentity, syncGoogleAvatar } from '@/lib/actions/account'
import { linkGoogleAccount } from '@/lib/supabase/client'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { GoogleDriveCard } from '@/components/account/google-drive-card'
import { PersonalDriveCard } from '@/components/account/personal-drive-card'

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
]

const TIMEZONE_OPTIONS = [
  // UTC
  { value: 'UTC', label: 'UTC' },
  // Americas
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Anchorage', label: 'Alaska' },
  { value: 'Pacific/Honolulu', label: 'Hawaii' },
  { value: 'America/Toronto', label: 'Eastern Time (Canada)' },
  { value: 'America/Vancouver', label: 'Pacific Time (Canada)' },
  { value: 'America/Mexico_City', label: 'Mexico City' },
  { value: 'America/Bogota', label: 'Bogota' },
  { value: 'America/Lima', label: 'Lima' },
  { value: 'America/Santiago', label: 'Santiago' },
  { value: 'America/Sao_Paulo', label: 'São Paulo' },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires' },
  // Europe
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Europe/Madrid', label: 'Madrid' },
  { value: 'Europe/Rome', label: 'Rome' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam' },
  { value: 'Europe/Brussels', label: 'Brussels' },
  { value: 'Europe/Zurich', label: 'Zurich' },
  { value: 'Europe/Stockholm', label: 'Stockholm' },
  { value: 'Europe/Oslo', label: 'Oslo' },
  { value: 'Europe/Copenhagen', label: 'Copenhagen' },
  { value: 'Europe/Helsinki', label: 'Helsinki' },
  { value: 'Europe/Warsaw', label: 'Warsaw' },
  { value: 'Europe/Prague', label: 'Prague' },
  { value: 'Europe/Vienna', label: 'Vienna' },
  { value: 'Europe/Lisbon', label: 'Lisbon' },
  { value: 'Europe/Athens', label: 'Athens' },
  { value: 'Europe/Istanbul', label: 'Istanbul' },
  { value: 'Europe/Moscow', label: 'Moscow' },
  // Asia/Pacific
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Asia/Riyadh', label: 'Riyadh' },
  { value: 'Asia/Karachi', label: 'Karachi' },
  { value: 'Asia/Kolkata', label: 'Mumbai, Kolkata' },
  { value: 'Asia/Dhaka', label: 'Dhaka' },
  { value: 'Asia/Bangkok', label: 'Bangkok' },
  { value: 'Asia/Jakarta', label: 'Jakarta' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Kuala_Lumpur', label: 'Kuala Lumpur' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
  { value: 'Asia/Shanghai', label: 'Beijing, Shanghai' },
  { value: 'Asia/Manila', label: 'Manila' },
  { value: 'Asia/Taipei', label: 'Taipei' },
  { value: 'Asia/Seoul', label: 'Seoul' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Makassar', label: 'Makassar' },
  { value: 'Pacific/Auckland', label: 'Auckland' },
  { value: 'Australia/Sydney', label: 'Sydney' },
  { value: 'Australia/Melbourne', label: 'Melbourne' },
  { value: 'Australia/Brisbane', label: 'Brisbane' },
  { value: 'Australia/Perth', label: 'Perth' },
  // Africa
  { value: 'Africa/Cairo', label: 'Cairo' },
  { value: 'Africa/Lagos', label: 'Lagos' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg' },
  { value: 'Africa/Nairobi', label: 'Nairobi' },
]

type Section = 'profile' | 'preferences' | 'security' | 'integrations'

interface AccountSettingsFormProps {
  preferredLanguage: string
  timezone: string
  displayName: string
  avatarUrl: string | null
  email: string
  connectedEmail: string | null
  personalDriveFolderId: string | null
  googleLinked: boolean
}

export function AccountSettingsForm({ preferredLanguage, timezone, displayName, avatarUrl, email, connectedEmail, personalDriveFolderId, googleLinked }: AccountSettingsFormProps) {
  const VALID_SECTIONS: Section[] = ['profile', 'preferences', 'security', 'integrations']
  const [activeSection, setActiveSection] = useState<Section>(() => {
    if (typeof window === 'undefined') return 'profile'
    const s = new URLSearchParams(window.location.search).get('section') as Section | null
    return s && VALID_SECTIONS.includes(s) ? s : 'profile'
  })

  // Profile state
  const [name, setName] = useState(displayName)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profilePending, startProfileTransition] = useTransition()

  // Preferences state
  const [language, setLanguage] = useState(preferredLanguage)
  const [tz, setTz] = useState(timezone)
  const [prefLangPending, startPrefLangTransition] = useTransition()
  const [prefTzPending, startPrefTzTransition] = useTransition()
  const [langError, setLangError] = useState<string | null>(null)
  const [tzError, setTzError] = useState<string | null>(null)

  // Auto-detect browser timezone when the saved value is still the default 'UTC'
  useEffect(() => {
    if (timezone === 'UTC') {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (detected && detected !== 'UTC') setTz(detected)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Google link state
  const [linkPending, setLinkPending] = useState(false)
  const [disconnectPending, startDisconnectTransition] = useTransition()
  const [syncPending, startSyncTransition] = useTransition()

  // Security state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordPending, startPasswordTransition] = useTransition()

  function handleSaveProfile() {
    setProfileError(null)
    startProfileTransition(async () => {
      const result = await updateProfile({ displayName: name })
      if (result?.error) { setProfileError(result.error); return }
      toast.success('Profile updated.')
    })
  }

  function handleSaveLanguage() {
    setLangError(null)
    startPrefLangTransition(async () => {
      const result = await updatePreferences({ preferred_language: language, timezone: tz })
      if (result?.error) { setLangError(result.error); return }
      toast.success('Language preference saved.')
    })
  }

  function handleSaveTimezone() {
    setTzError(null)
    startPrefTzTransition(async () => {
      const result = await updatePreferences({ preferred_language: language, timezone: tz })
      if (result?.error) { setTzError(result.error); return }
      toast.success('Timezone saved.')
    })
  }

  function handleChangePassword() {
    setPasswordError(null)
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }
    startPasswordTransition(async () => {
      const result = await updatePassword({ currentPassword, newPassword, confirmPassword })
      if (result?.error) { setPasswordError(result.error); return }
      toast.success('Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    })
  }

  const SIDEBAR_ITEMS: { id: Section; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'security', label: 'Security' },
    { id: 'integrations', label: 'Integrations' },
  ]

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
      {/* Sidebar */}
      <nav className="sm:w-[180px] sm:flex-shrink-0">
        <p className="mb-2 hidden text-[11px] font-semibold uppercase tracking-wider text-foreground-muted sm:block">Account</p>
        <ul className="flex flex-row gap-1 overflow-x-auto sm:flex-col sm:gap-0.5 sm:overflow-x-visible">
          {SIDEBAR_ITEMS.map((item) => (
            <li key={item.id} className="flex-shrink-0 sm:flex-shrink">
              <button
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'whitespace-nowrap rounded-lg px-3 py-2 text-left text-[13px] transition-colors sm:w-full',
                  activeSection === item.id
                    ? 'bg-background-muted font-medium text-foreground'
                    : 'text-foreground-lighter hover:bg-background-muted hover:text-foreground'
                )}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col gap-6 max-w-lg">

        {activeSection === 'profile' && (
          <>
            <div>
              <h1 className="text-[18px] font-semibold text-foreground">Profile</h1>
              <p className="text-[12px] text-foreground-lighter mt-0.5">Your name as shown to teammates.</p>
            </div>

            <div className="rounded-xl border border-border bg-background-surface p-5">
              <h2 className="text-[13px] font-semibold text-foreground mb-4">Display Name</h2>
              <div className="flex flex-col gap-4">
                {/* Current identity — read-only */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex-shrink-0 rounded-full overflow-hidden border border-border">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-brand/10 text-[13px] font-semibold text-brand">
                        {getInitials(name)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">{name}</p>
                    <p className="text-[11px] text-foreground-muted">{email}</p>
                  </div>
                </div>

                <Input
                  label="Display name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={profilePending}
                  autoComplete="name"
                />
                {profileError && <p className="text-[11px] text-destructive">{profileError}</p>}
                <div>
                  <Button variant="primary" size="sm" loading={profilePending} onClick={handleSaveProfile}>
                    Save
                  </Button>
                </div>
              </div>
            </div>
            {/* Connected Accounts */}
            <div className="rounded-xl border border-border bg-background-surface p-5">
              <h2 className="text-[13px] font-semibold text-foreground mb-4">Connected Accounts</h2>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-background">
                    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-foreground">Google</p>
                    <p className="text-[11px] text-foreground-muted">
                      {googleLinked ? 'Connected — profile photo synced' : 'Connect to sync your profile photo'}
                    </p>
                  </div>
                </div>
                {googleLinked ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      loading={syncPending}
                      disabled={disconnectPending}
                      onClick={() => {
                        startSyncTransition(async () => {
                          const result = await syncGoogleAvatar()
                          if (result?.error) { toast.error(result.error); return }
                          toast.success('Profile photo synced.')
                        })
                      }}
                    >
                      Sync photo
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={disconnectPending}
                      disabled={syncPending}
                      onClick={() => {
                        startDisconnectTransition(async () => {
                          const result = await unlinkGoogleIdentity()
                          if (result?.error) { toast.error(result.error); return }
                          toast.success('Google account disconnected.')
                        })
                      }}
                    >
                      Disconnect
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={linkPending}
                    onClick={() => {
                      setLinkPending(true)
                      linkGoogleAccount()
                    }}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {activeSection === 'preferences' && (
          <>
            <div>
              <h1 className="text-[18px] font-semibold text-foreground">Preferences</h1>
              <p className="text-[12px] text-foreground-lighter mt-0.5">Customize your experience.</p>
            </div>

            {/* Language card */}
            <div className="rounded-xl border border-border bg-background-surface p-5">
              <h2 className="text-[13px] font-semibold text-foreground mb-4">Preferred Language</h2>
              <div className="flex flex-col gap-4">
                <Select
                  label="Language"
                  options={LANGUAGE_OPTIONS}
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  disabled={prefLangPending}
                />
                {langError && <p className="text-[11px] text-destructive">{langError}</p>}
                <div>
                  <Button variant="primary" size="sm" loading={prefLangPending} onClick={handleSaveLanguage}>
                    Save
                  </Button>
                </div>
              </div>
            </div>

            {/* Timezone card */}
            <div className="rounded-xl border border-border bg-background-surface p-5">
              <h2 className="text-[13px] font-semibold text-foreground mb-4">Timezone</h2>
              <div className="flex flex-col gap-4">
                <Select
                  label="Timezone"
                  hint="Post timestamps and analytics dates use this timezone."
                  options={TIMEZONE_OPTIONS}
                  value={tz}
                  onChange={(e) => setTz(e.target.value)}
                  disabled={prefTzPending}
                />
                {tz !== timezone && !tzError && (
                  <p className="text-[11px] text-foreground-muted">Detected from your browser — click Save to apply.</p>
                )}
                {tzError && <p className="text-[11px] text-destructive">{tzError}</p>}
                <div>
                  <Button variant="primary" size="sm" loading={prefTzPending} onClick={handleSaveTimezone}>
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {activeSection === 'security' && (
          <>
            <div>
              <h1 className="text-[18px] font-semibold text-foreground">Security</h1>
              <p className="text-[12px] text-foreground-lighter mt-0.5">Manage your account security.</p>
            </div>

            {/* Change password card */}
            <div className="rounded-xl border border-border bg-background-surface p-5">
              <h2 className="text-[13px] font-semibold text-foreground mb-4">Change Password</h2>
              <div className="flex flex-col gap-4">
                <Input
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={passwordPending}
                  autoComplete="current-password"
                />
                <Input
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordPending}
                  autoComplete="new-password"
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passwordPending}
                  autoComplete="new-password"
                />
                {passwordError && <p className="text-[11px] text-destructive">{passwordError}</p>}
                <div>
                  <Button variant="primary" size="sm" loading={passwordPending} onClick={handleChangePassword}>
                    Update password
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {activeSection === 'integrations' && (
          <>
            <div>
              <h1 className="text-[18px] font-semibold text-foreground">Integrations</h1>
              <p className="text-[12px] text-foreground-lighter mt-0.5">Connect third-party services to your account.</p>
            </div>
            <GoogleDriveCard connectedEmail={connectedEmail} />
            {connectedEmail && (
              <PersonalDriveCard currentFolderId={personalDriveFolderId} />
            )}
          </>
        )}

      </div>
    </div>
  )
}
