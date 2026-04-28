import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Instroom Post Tracker',
  description: 'Terms of Service for Instroom Post Tracker by Armful Media.',
}

const LAST_UPDATED = 'April 20, 2026'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background px-[5%] py-20">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-border bg-background-surface p-8 md:p-12">
          <h1 className="font-display text-3xl font-bold text-foreground">Terms of Service</h1>
          <p className="mt-2 text-[13px] text-foreground-muted">Last updated: {LAST_UPDATED}</p>

          <div className="mt-8 space-y-8 text-[14px] leading-relaxed text-foreground-light">

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p>
                Instroom Post Tracker (available at <a href="https://posttracker.instroom.io" className="text-brand hover:underline">posttracker.instroom.io</a>) is operated by Armful Media. Using the platform means you accept these terms.
              </p>
              <p>
                We may update these terms occasionally. For material changes, we&apos;ll give you at least 14 days&apos; notice by email or in-app message before they take effect. Continuing to use Instroom after that means you accept the changes.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">2. Description of Service</h2>
              <p>
                Instroom Post Tracker is an influencer marketing SaaS platform that helps brands and agencies:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Automatically detect and monitor influencer posts across Instagram, TikTok, and YouTube</li>
                <li>Download influencer post media to a configured Google Drive folder</li>
                <li>Track post performance metrics and calculate Estimated Media Value (EMV)</li>
                <li>Manage campaigns, influencers, and team members within workspaces</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">3. Accounts and Registration</h2>
              <p>
                You&apos;ll need an account to use Instroom. Use accurate information when signing up — we need a real email address to send verification and billing emails. Keep your login details secure; anything that happens under your account is your responsibility.
              </p>
              <p>
                If you suspect unauthorized access to your account, let us know at <a href="mailto:hello@armfulmedia.com" className="text-brand hover:underline">hello@armfulmedia.com</a> right away.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">4. Plans and Trial</h2>
              <p>
                The Service is offered under the following plans:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li><strong className="text-foreground">Trial:</strong> A limited-time free trial period granting access to all features. Trial duration is displayed within the app.</li>
                <li><strong className="text-foreground">Solo Plan:</strong> Paid plan for individual users. Includes one workspace and core monitoring features.</li>
                <li><strong className="text-foreground">Team Plan:</strong> Paid plan for teams. Includes multiple workspaces and team member management.</li>
              </ul>
              <p>
                After the trial period ends, access to paid features is restricted until a subscription is activated. We reserve the right to modify plan features and pricing with reasonable notice.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">5. Payment and Billing</h2>
              <p>
                Paid subscriptions are processed through LemonSqueezy. By subscribing, you agree to LemonSqueezy&apos;s terms and authorize recurring charges to your payment method.
              </p>
              <p>
                Subscription fees are non-refundable except where required by applicable law. We reserve the right to suspend or terminate access for non-payment.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">6. Google Drive Integration</h2>
              <p>
                Instroom uses a server-side Google service account to automatically upload downloaded influencer media to a folder in Google Drive. Workspace administrators enable this by entering a Drive folder ID in workspace settings — that folder is where Instroom creates and uploads files.
              </p>
              <p>
                The service account only writes to the configured folder. It does not access, read, modify, or delete anything outside of it. To disable Drive uploads, remove the folder ID from workspace settings.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">7. User Responsibilities</h2>
              <p>You agree not to:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Use Instroom for anything illegal under Philippine law or the laws of your own jurisdiction</li>
                <li>Track influencers without a legitimate business relationship or consent</li>
                <li>Attempt to circumvent any security measures or access restrictions</li>
                <li>Use the Service to infringe on the intellectual property rights of others</li>
                <li>Resell or sublicense access to the Service without written permission</li>
                <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
                <li>Interfere with the proper functioning of the Service</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">8. Intellectual Property</h2>
              <p>
                The platform — its design, code, and the Instroom name — belongs to Armful Media. Your data (campaigns, influencer lists, workspace content) stays yours. By using Instroom, you give us a limited right to store and process that data for the sole purpose of running the service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">9. Third-Party Content</h2>
              <p>
                Influencer post data and media retrieved by the Service is publicly available content from third-party social media platforms. We do not claim ownership of such content. You are responsible for ensuring your use of downloaded influencer content complies with applicable platform terms and copyright law.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">10. Disclaimer of Warranties</h2>
              <p>
                Instroom is provided as-is — we don&apos;t make guarantees about uptime or completeness. Post detection runs on a daily scheduled job; we can&apos;t promise real-time coverage or that every tagged post will be caught. Social media platforms change their APIs without notice, which can temporarily affect how much data we&apos;re able to retrieve.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">11. Limitation of Liability</h2>
              <p>
                Armful Media is not liable for missed influencer posts, metric inaccuracies, data loss, or downstream business consequences resulting from your use of Instroom — including losses caused by social media platform changes or third-party service outages. This applies to the fullest extent permitted under Philippine law.
              </p>
              <p>
                Our total liability to you for any claim arising from use of the Service shall not exceed the amount you paid us in the three months preceding the claim.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">12. Termination</h2>
              <p>
                You can cancel your account at any time by emailing <a href="mailto:hello@armfulmedia.com" className="text-brand hover:underline">hello@armfulmedia.com</a>. We may suspend or terminate accounts for violations of these Terms, non-payment, fraudulent activity, or if we discontinue the Service — we&apos;ll give reasonable notice except where immediate action is needed to protect other users or the platform.
              </p>
              <p>
                Upon termination, your access to the Service will cease. Data may be retained for a limited period before deletion as described in our Privacy Policy.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">13. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the Republic of the Philippines. Before taking any formal action, raise the issue with us at <a href="mailto:hello@armfulmedia.com" className="text-brand hover:underline">hello@armfulmedia.com</a>. We&apos;ll respond within 5 business days. If we can&apos;t reach agreement after 30 days of discussion, either party may pursue formal proceedings under Philippine law.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">14. Contact Us</h2>
              <p>
                Questions about these Terms? Email us at <a href="mailto:hello@armfulmedia.com" className="text-brand hover:underline">hello@armfulmedia.com</a>.
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
