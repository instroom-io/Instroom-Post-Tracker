'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { updatePreferences, updatePassword, updateProfile } from '@/lib/actions/account'
import { getInitials } from '@/lib/utils'
import { cn } from '@/lib/utils'

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

type Section = 'profile' | 'preferences' | 'security'

interface AccountSettingsFormProps {
  preferredLanguage: string
  timezone: string
  displayName: string
  avatarUrl: string | null
  email: string
}

export function AccountSettingsForm({ preferredLanguage, timezone, displayName, avatarUrl, email }: AccountSettingsFormProps) {
  const [activeSection, setActiveSection] = useState<Section>('profile')

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
  ]

  return (
    <div className="flex gap-10">
      {/* Sidebar */}
      <nav className="w-[180px] flex-shrink-0">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-foreground-muted">Account</p>
        <ul className="flex flex-col gap-0.5">
          {SIDEBAR_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
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

      </div>
    </div>
  )
}
