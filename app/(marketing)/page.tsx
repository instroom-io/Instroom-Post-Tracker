import Link from 'next/link'
import { Download, BarChart2, Shield, Zap } from 'lucide-react'

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-24 pt-20 text-center">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand/5 to-transparent" />
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center rounded-full border border-brand/25 bg-brand/10 px-3 py-1 text-[11px] font-semibold text-brand">
            Influencer marketing infrastructure
          </div>
          <h1 className="font-display text-[42px] font-extrabold leading-[1.1] text-foreground sm:text-[52px]">
            Track every post.
            <br />
            <span className="text-brand">Download everything.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] text-foreground-lighter">
            Instroom automatically detects influencer posts via Ensemble, downloads
            content watermark-free to Google Drive, and surfaces performance metrics
            — all in one platform built for marketing agencies.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="inline-flex h-10 items-center rounded-xl bg-brand px-6 text-[13px] font-semibold text-white hover:bg-brand-dark transition-colors"
            >
              Start free trial
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-xl border border-border px-6 text-[13px] font-semibold text-foreground hover:bg-background-muted transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Mock dashboard screenshot */}
        <div className="mx-auto mt-16 max-w-4xl">
          <div className="overflow-hidden rounded-2xl border border-border bg-background-surface shadow-2xl">
            <div className="flex h-8 items-center gap-2 border-b border-border bg-background-overlay px-4">
              <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
              <div className="h-2.5 w-2.5 rounded-full bg-brand/60" />
            </div>
            <div className="grid grid-cols-4 gap-4 p-6">
              {[
                { label: 'Posts tracked', value: '2,847' },
                { label: 'Downloaded', value: '2,601' },
                { label: 'Total EMV', value: '$184K' },
                { label: 'Active campaigns', value: '12' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-[22px] font-display font-extrabold text-foreground">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-background-surface px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="font-display text-[30px] font-extrabold text-foreground">
              Everything your agency needs
            </h2>
            <p className="mt-3 text-[13px] text-foreground-lighter">
              Built specifically for influencer marketing agencies managing multiple brands.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Zap,
                title: 'Automatic detection',
                description:
                  'Ensemble webhooks notify Instroom the moment an influencer publishes. No manual tracking needed.',
              },
              {
                icon: Download,
                title: 'Watermark-free downloads',
                description:
                  'Content downloads directly to structured Google Drive folders — organized by brand, campaign, and influencer.',
              },
              {
                icon: Shield,
                title: 'Usage rights gating',
                description:
                  'Toggle usage rights per influencer per campaign. Downloads only proceed when rights are confirmed.',
              },
              {
                icon: BarChart2,
                title: 'Performance analytics',
                description:
                  'Frozen 7-day metrics snapshots, EMV calculations, ER benchmarks, and influencer leaderboards.',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-background p-5"
              >
                <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10">
                  <feature.icon size={16} className="text-brand" />
                </div>
                <h3 className="font-display text-[14px] font-bold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-[12px] text-foreground-lighter">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-[30px] font-extrabold text-foreground">
            How it works
          </h2>
          <p className="mt-3 text-[13px] text-foreground-lighter">
            From post detection to Drive in minutes.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl">
          {[
            {
              step: '01',
              title: 'Set up your campaign',
              description:
                'Create a campaign, add the influencers, configure hashtags and mentions to monitor, and toggle on usage rights when contracts are signed.',
            },
            {
              step: '02',
              title: 'Ensemble detects posts',
              description:
                'When an influencer publishes using your tracked hashtags or mentions, Ensemble notifies Instroom via webhook within minutes.',
            },
            {
              step: '03',
              title: 'Content lands in Drive',
              description:
                'Instroom downloads the watermark-free content and organizes it in your Google Drive under Workspace → Campaign → Influencer → Platform.',
            },
          ].map((item, idx) => (
            <div
              key={item.step}
              className={`flex gap-6 ${idx < 2 ? 'mb-8 pb-8 border-b border-border' : ''}`}
            >
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 font-display text-[12px] font-extrabold text-brand">
                  {item.step}
                </div>
              </div>
              <div>
                <h3 className="font-display text-[15px] font-bold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-1 text-[13px] text-foreground-lighter">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-background-surface px-6 py-20">
        <div className="mx-auto max-w-md text-center">
          <h2 className="font-display text-[30px] font-extrabold text-foreground">
            Simple pricing
          </h2>
          <p className="mt-3 text-[13px] text-foreground-lighter">
            One plan. Everything included.
          </p>

          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-background shadow-lg">
            <div className="border-b border-border bg-brand/5 p-6">
              <p className="font-display text-[15px] font-bold text-foreground">
                Agency plan
              </p>
              <div className="mt-2 flex items-baseline justify-center gap-1">
                <span className="font-display text-[40px] font-extrabold text-foreground">
                  $299
                </span>
                <span className="text-[13px] text-foreground-lighter">/month</span>
              </div>
              <p className="mt-1 text-[12px] text-foreground-muted">
                Unlimited workspaces, campaigns, and influencers
              </p>
            </div>
            <div className="p-6">
              <ul className="space-y-3 text-left">
                {[
                  'Unlimited post tracking',
                  'Google Drive auto-download',
                  'Usage rights management',
                  'Performance analytics + EMV',
                  'Multi-workspace support',
                  'Team roles (Owner/Admin/Editor/Viewer)',
                  'Ensemble webhook integration',
                ].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2.5 text-[12px] text-foreground"
                  >
                    <span className="text-brand">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-6 flex h-10 w-full items-center justify-center rounded-xl bg-brand text-[13px] font-semibold text-white hover:bg-brand-dark transition-colors"
              >
                Start your free trial
              </Link>
              <p className="mt-3 text-center text-[11px] text-foreground-muted">
                14-day free trial. No credit card required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-display text-[30px] font-extrabold text-foreground">
            Ready to automate your content tracking?
          </h2>
          <p className="mt-4 text-[14px] text-foreground-lighter">
            Join agencies already saving hours every week with Instroom.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex h-11 items-center rounded-xl bg-brand px-8 text-[13px] font-semibold text-white hover:bg-brand-dark transition-colors"
          >
            Get started free
          </Link>
        </div>
      </section>
    </>
  )
}
