import Image from 'next/image'
import Link from 'next/link'
import { SignupForm } from './signup-form'

interface PageProps {
  searchParams: Promise<{ redirectTo?: string }>
}

export default async function SignupPage({ searchParams }: PageProps) {
  const { redirectTo } = await searchParams
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="mx-auto mb-4 flex justify-center opacity-100 transition-opacity hover:opacity-75">
            <Image src="/POST_TRACKER.svg" alt="Instroom Post Tracker" width={180} height={40} priority />
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-background-surface p-6 shadow-sm">
          <SignupForm redirectTo={redirectTo} />
        </div>
      </div>
    </div>
  )
}
