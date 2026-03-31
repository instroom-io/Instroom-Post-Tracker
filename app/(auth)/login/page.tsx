import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react/dist/ssr'
import { LoginForm } from './login-form'

interface PageProps {
  searchParams: Promise<{ redirectTo?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { redirectTo, error } = await searchParams
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background px-4"
      style={{ backgroundImage: 'radial-gradient(ellipse 80% 50% at 70% 0%, hsl(var(--brand) / 0.07) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 20% 100%, hsl(var(--brand) / 0.04) 0%, transparent 50%)' }}
    >
      <div className="w-full max-w-sm">
        {error === 'work_email_required' && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-[12px] text-destructive">
            Please use a work email address. Personal email providers (Gmail, Yahoo, etc.) are not allowed.
          </div>
        )}
        <div className="mb-8 text-center">
          <Link href="/" className="mx-auto mb-4 flex justify-center opacity-100 transition-opacity hover:opacity-75">
            <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={180} height={40} priority />
          </Link>
          <h1 className="font-display text-[22px] font-extrabold text-foreground">
            Welcome back
          </h1>
          <p className="mt-1 text-[13px] text-foreground-lighter">
            Sign in to your Instroom account
          </p>
          <div className="mt-3 flex justify-center">
            <Link href="/" className="inline-flex items-center gap-1 text-[12px] text-foreground-muted transition-colors hover:text-foreground">
              <ArrowLeft className="h-3 w-3" />
              Back to home
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-background-surface p-6 shadow-sm">
          <LoginForm redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  )
}
