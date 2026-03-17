import Image from 'next/image'
import { SignupForm } from './signup-form'

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex justify-center">
            <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={180} height={40} className="brightness-0 dark:invert" priority />
          </div>
          <h1 className="font-display text-[22px] font-extrabold text-foreground">
            Create your account
          </h1>
          <p className="mt-1 text-[13px] text-foreground-lighter">
            Start tracking influencer campaigns
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background-surface p-6 shadow-sm">
          <SignupForm />
        </div>
      </div>
    </div>
  )
}
