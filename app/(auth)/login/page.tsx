import Image from 'next/image'
import Link from 'next/link'
import { LoginForm } from './login-form'

interface PageProps {
  searchParams: Promise<{ redirectTo?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: PageProps) {
  const { redirectTo, error } = await searchParams
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-background px-4"
      style={{ backgroundImage: 'radial-gradient(ellipse 80% 50% at 70% 0%, hsl(var(--brand) / 0.07) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 20% 100%, hsl(var(--brand) / 0.04) 0%, transparent 50%)' }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="mx-auto mb-4 flex justify-center opacity-100 transition-opacity hover:opacity-75">
            <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={180} height={40} priority />
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-background-surface p-6 shadow-sm">
          <LoginForm redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  )
}
