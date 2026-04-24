import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Instroom Post Tracker',
  description: 'Privacy Policy for Instroom Post Tracker by Armful Media.',
}

const LAST_UPDATED = 'April 20, 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-[5%] py-20">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-border bg-background-surface p-8 md:p-12">
          <h1 className="font-display text-3xl font-bold text-foreground">Privacy Policy</h1>
          <p className="mt-2 text-[13px] text-foreground-muted">Last updated: {LAST_UPDATED}</p>

          <div className="mt-8 space-y-8 text-[14px] leading-relaxed text-foreground-light">

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">1. Introduction</h2>
              <p>
                Instroom Post Tracker (&quot;Instroom&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is a product of Armful Media. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our influencer marketing platform (the &quot;Service&quot;).
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">2. Information We Collect</h2>
              <p><strong className="text-foreground">Account information:</strong> When you sign up, we collect your name, email address, and password (hashed). If you sign up via Google OAuth, we receive your name, email, and profile picture from Google.</p>
              <p><strong className="text-foreground">Workspace and campaign data:</strong> We store information you enter into the Service, including workspace names, campaign names, influencer handles (Instagram, TikTok, YouTube), campaign tracking configurations (hashtags and mentions), and campaign dates.</p>
              <p><strong className="text-foreground">Post data:</strong> We collect publicly available influencer post metadata including post URLs, captions, thumbnail images, media URLs, publication dates, and performance metrics (views, likes, comments, shares, engagement rate).</p>
              <p><strong className="text-foreground">Google Drive integration:</strong> Instroom uses its own server-side Google service account to upload downloaded influencer media to your workspace&apos;s designated Drive folder. Workspace administrators configure the target folder by entering a Drive folder ID in workspace settings. No individual user OAuth tokens for Google Drive are collected or stored — the service account operates independently of your personal Google account and writes only to the configured folder.</p>
              <p><strong className="text-foreground">Usage data:</strong> Our hosting providers (Vercel for the web app, Railway for background workers) capture standard server logs — IP addresses, request timestamps, and response codes — as part of normal infrastructure operation. Instroom itself does not run separate behavioral analytics.</p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">3. How We Use Your Information</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>To provide, operate, and maintain the Service</li>
                <li>To automatically detect and download influencer posts on your behalf</li>
                <li>To upload downloaded media files to your workspace&apos;s configured Google Drive folder</li>
                <li>To calculate engagement metrics and estimated media value (EMV)</li>
                <li>To send transactional emails (account verification, trial reminders, team invitations) via SendGrid</li>
                <li>To process subscription payments via LemonSqueezy</li>
                <li>To respond to support requests</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">4. Google API Services</h2>
              <p>
                Instroom Post Tracker&apos;s use of information received from Google APIs adheres to the{' '}
                <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements.
              </p>
              <p>We use Google OAuth solely to:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Authenticate users who choose to sign in with Google (email and profile information only)</li>
                <li>Upload influencer media files to workspace-designated Google Drive folders via a server-side service account (no Google Drive OAuth tokens are collected from users)</li>
              </ul>
              <p>We do not share Google user data with third parties except as necessary to provide the Service. We do not use Google user data for advertising purposes.</p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">5. Third-Party Services</h2>
              <p>We use the following third-party services to operate the platform:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><strong className="text-foreground">Supabase</strong> — database hosting, authentication, and file storage</li>
                <li><strong className="text-foreground">Google Drive API</strong> — storing downloaded influencer media in your workspace&apos;s Drive folder</li>
                <li><strong className="text-foreground">EnsembleData</strong> — social media data API for detecting influencer posts</li>
                <li><strong className="text-foreground">SendGrid</strong> — transactional email delivery</li>
                <li><strong className="text-foreground">LemonSqueezy</strong> — subscription billing and payment processing</li>
                <li><strong className="text-foreground">Vercel</strong> — application hosting</li>
                <li><strong className="text-foreground">Railway</strong> — background worker hosting</li>
              </ul>
              <p>Each third party has its own privacy policy governing its use of data.</p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">6. Data Sharing</h2>
              <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>With service providers listed above, as necessary to operate the Service</li>
                <li>With other members of your workspace, to the extent you have invited them</li>
                <li>If required by law or to protect our rights and safety</li>
                <li>In connection with a business transfer or acquisition</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">7. Data Retention</h2>
              <p>
                We retain your account and workspace data for as long as your account is active. If you delete your account, we will delete your personal information within 30 days, except where retention is required by law or for legitimate business purposes (e.g. billing records).
              </p>
              <p>
                Downloaded media files stored in your Google Drive are owned and managed by you — we do not retain copies on our servers beyond the download process.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">8. Security</h2>
              <p>
                We implement security measures including hashed password storage, row-level security on all database tables, HTTPS-only access, and encrypted storage of sensitive credentials.
              </p>
              <p>
                We can&apos;t guarantee perfect security — no internet service can. In practice: passwords are hashed and never stored in plain text, all database access uses row-level security, the app is HTTPS-only, and sensitive credentials are encrypted at rest. If we become aware of a security incident affecting your data, we&apos;ll notify you promptly.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">9. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your account and data</li>
                <li>Revoke Google OAuth access at any time via your Google Account settings</li>
                <li>Export your data upon request</li>
              </ul>
              <p>To exercise any of these rights, contact us at <a href="mailto:hello@armfulmedia.com" className="text-brand hover:underline">hello@armfulmedia.com</a>.</p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">10. Children&apos;s Privacy</h2>
              <p>
                The Service is not directed to individuals under the age of 16. We do not knowingly collect personal information from children. If you believe we have inadvertently collected such information, please contact us immediately.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">11. Changes to This Policy</h2>
              <p>
                We&apos;ll update this policy when our data practices change. For meaningful changes, we&apos;ll send an email or show an in-app notice at least 14 days before they take effect. If you continue using Instroom after that, we&apos;ll take that as acceptance.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">12. Contact Us</h2>
              <p>
                Questions about this policy? Email us at <a href="mailto:hello@armfulmedia.com" className="text-brand hover:underline">hello@armfulmedia.com</a>.
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
