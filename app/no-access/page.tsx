import Image from 'next/image'
import Link from 'next/link'
import { signOut } from '@/lib/actions/auth'

export default function NoAccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex justify-center">
          <Image
            src="/POST_TRACKER.svg"
            alt="Instroom Post Tracker"
            width={180}
            height={40}
            className="brightness-0 dark:invert"
            priority
          />
        </div>

        <div className="rounded-xl border border-border bg-background-surface p-8 shadow-sm">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background-subtle">
              <svg className="h-6 w-6 text-foreground-lighter" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
          </div>

          <h1 className="font-display text-[18px] font-extrabold text-foreground">
            No workspace access
          </h1>
          <p className="mt-2 text-[13px] text-foreground-lighter leading-relaxed">
            Your account isn&apos;t linked to any workspace yet. If you&apos;re a brand, please use the onboarding link provided by your agency.
          </p>

          <form action={signOut} className="mt-6">
            <button
              type="submit"
              className="w-full rounded-lg bg-background-subtle px-4 py-2 text-[13px] font-medium text-foreground hover:bg-background-subtle/80 transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>

        <p className="mt-4 text-[12px] text-foreground-muted">
          Already have an invite?{' '}
          <Link href="/login" className="text-foreground-lighter underline underline-offset-2">
            Sign in with a different account
          </Link>
        </p>
      </div>
    </div>
  )
}
