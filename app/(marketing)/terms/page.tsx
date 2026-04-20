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
                By accessing or using Instroom Post Tracker (&quot;Instroom&quot;, &quot;the Service&quot;), operated by Armful Media, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.
              </p>
              <p>
                We may modify these terms at any time. Continued use of the Service after modifications constitutes acceptance of the updated terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">2. Description of Service</h2>
              <p>
                Instroom Post Tracker is an influencer marketing SaaS platform that helps brands and agencies:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Automatically detect and monitor influencer posts across Instagram, TikTok, and YouTube</li>
                <li>Download influencer post media to a connected Google Drive folder</li>
                <li>Track post performance metrics and calculate Estimated Media Value (EMV)</li>
                <li>Manage campaigns, influencers, and team members within workspaces</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">3. Accounts and Registration</h2>
              <p>
                You must create an account to use the Service. You are responsible for maintaining the confidentiality of your credentials and for all activity that occurs under your account. You must provide accurate and complete information during registration.
              </p>
              <p>
                You may not use another user&apos;s account without permission. Notify us immediately at <a href="mailto:support@instroom.co" className="text-brand hover:underline">support@instroom.co</a> if you suspect unauthorized access to your account.
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
                The Service allows you to connect your Google account to automatically upload downloaded influencer media to your Google Drive. By connecting your Google account, you authorize us to:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Create and upload files to your designated Drive folder</li>
                <li>Create subfolders within your designated Drive folder to organize content</li>
              </ul>
              <p>
                We will not access, read, modify, or delete any files outside of the folder(s) you designate. You may revoke this access at any time through your Google Account settings. Revoking access will disable automatic downloads but will not affect files already uploaded.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">7. User Responsibilities</h2>
              <p>You agree not to:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>Use the Service for any unlawful purpose</li>
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
                The Service, including its design, code, and content, is owned by Armful Media and protected by applicable intellectual property laws. You retain ownership of the data you input into the Service (campaign data, influencer lists, etc.).
              </p>
              <p>
                By using the Service, you grant us a limited license to store and process your data solely to provide the Service.
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
                The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied. We do not warrant that the Service will be uninterrupted, error-free, or that all influencer posts will be detected. Social media platform API limitations may affect data availability.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">11. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Armful Media shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to missed influencer posts, data loss, or issues with third-party integrations.
              </p>
              <p>
                Our total liability to you for any claim arising from use of the Service shall not exceed the amount you paid us in the three months preceding the claim.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">12. Termination</h2>
              <p>
                You may cancel your account at any time by contacting us at <a href="mailto:support@instroom.co" className="text-brand hover:underline">support@instroom.co</a>. We reserve the right to suspend or terminate your account if you violate these Terms or for any other reason with reasonable notice.
              </p>
              <p>
                Upon termination, your access to the Service will cease. Data may be retained for a limited period before deletion as described in our Privacy Policy.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">13. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with applicable law. Any disputes shall be resolved through good-faith negotiation before pursuing formal proceedings.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-semibold text-foreground">14. Contact Us</h2>
              <p>
                For questions about these Terms of Service, please contact:<br />
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
