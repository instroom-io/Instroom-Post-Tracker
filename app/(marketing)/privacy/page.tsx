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
                Instroom Post Tracker (&quot;Instroom&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is a product of Armful Media. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our influencer marketing platform available at instroom.co and instroom-post-tracker.vercel.app (the &quot;Service&quot;).
              </p>
              <p>
                By using the Service, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">2. Information We Collect</h2>
              <p><strong className="text-foreground">Account information:</strong> When you sign up, we collect your name, email address, and password (hashed). If you sign up via Google OAuth, we receive your name, email, and profile picture from Google.</p>
              <p><strong className="text-foreground">Workspace and campaign data:</strong> We store information you enter into the Service, including workspace names, campaign names, influencer handles (Instagram, TikTok, YouTube), campaign tracking configurations (hashtags and mentions), and campaign dates.</p>
              <p><strong className="text-foreground">Post data:</strong> We collect publicly available influencer post metadata including post URLs, captions, thumbnail images, media URLs, publication dates, and performance metrics (views, likes, comments, shares, engagement rate).</p>
              <p><strong className="text-foreground">Google Drive integration:</strong> If you connect your Google account to enable automatic post downloads, we request access to your Google Drive to upload downloaded influencer media files into your designated Drive folder. We store OAuth access and refresh tokens securely in our database. We only access the specific folder(s) you authorize — we do not read, modify, or delete any other files in your Drive.</p>
              <p><strong className="text-foreground">Usage data:</strong> We may collect information about how you access and use the Service, including your IP address, browser type, pages visited, and actions taken within the app.</p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">3. How We Use Your Information</h2>
              <ul className="list-disc space-y-1 pl-5">
                <li>To provide, operate, and maintain the Service</li>
                <li>To automatically detect and download influencer posts on your behalf</li>
                <li>To upload downloaded media files to your connected Google Drive folder</li>
                <li>To calculate engagement metrics and estimated media value (EMV)</li>
                <li>To send transactional emails (account verification, trial reminders, team invitations) via SendGrid</li>
                <li>To process subscription payments via LemonSqueezy</li>
                <li>To respond to support requests</li>
                <li>To improve and develop the Service</li>
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
                <li>Authenticate users who choose to sign in with Google</li>
                <li>Upload influencer media files to the user&apos;s designated Google Drive folder</li>
              </ul>
              <p>We do not share Google user data with third parties except as necessary to provide the Service. We do not use Google user data for advertising purposes.</p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">5. Third-Party Services</h2>
              <p>We use the following third-party services to operate the platform:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li><strong className="text-foreground">Supabase</strong> — database hosting, authentication, and file storage</li>
                <li><strong className="text-foreground">Google Drive API</strong> — storing downloaded influencer media in your Drive</li>
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
                We implement industry-standard security measures including encrypted storage of credentials, row-level security on all database tables, and HTTPS-only access. Google OAuth tokens are stored encrypted and are only used to perform Drive operations on your behalf.
              </p>
              <p>
                No method of transmission over the internet is 100% secure. We cannot guarantee absolute security, but we take commercially reasonable steps to protect your data.
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
              <p>To exercise any of these rights, contact us at <a href="mailto:support@instroom.co" className="text-brand hover:underline">support@instroom.co</a>.</p>
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
                We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by a notice within the Service. Continued use of the Service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">12. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy, please contact us at:<br />
                <a href="mailto:support@instroom.co" className="text-brand hover:underline">support@instroom.co</a><br />
                Armful Media
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
