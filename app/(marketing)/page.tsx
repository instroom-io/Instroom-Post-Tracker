import type { Metadata } from 'next'
import { HeroSection } from '@/components/marketing/hero-section'
import { PainSection } from '@/components/marketing/pain-section'
import { HowItWorksSection } from '@/components/marketing/how-it-works-section'
import { FeaturesSection } from '@/components/marketing/features-section'
import { ComparisonSection } from '@/components/marketing/comparison-section'
import { WhoSection } from '@/components/marketing/who-section'
import { PricingSection } from '@/components/marketing/pricing-section'
import { FaqSection } from '@/components/marketing/faq-section'
import { CtaSection } from '@/components/marketing/cta-section'

export const metadata: Metadata = {
  title: 'Instroom Post Tracker — Automate Influencer Post Monitoring | Never Miss a Post',
  description:
    'Instroom Post Tracker automatically monitors every post from your campaign influencers by hashtag and mention, downloads content to Google Drive, and builds your UGC library on autopilot. Built for brands, agencies, and freelancers. Start free.',
  openGraph: {
    title: 'Instroom Post Tracker — Influencer Post Monitoring on Autopilot',
    description:
      'Automatically monitor influencer posts by hashtag and mention, download content to Google Drive, and build your UGC library on autopilot.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Does it track random people who use my hashtag?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "No — and that's the entire point. Post Tracker only monitors influencers you've added to your campaign. You get signal, not noise.",
      },
    },
    {
      '@type': 'Question',
      name: 'How does automatic content download work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "When an influencer has been marked as having granted usage rights, Post Tracker automatically downloads their posts and saves them to your designated Google Drive folder — no manual steps required.",
      },
    },
    {
      '@type': 'Question',
      name: 'Is this a separate product from Instroom CRM?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes. Post Tracker is a standalone SaaS — you don't pay for features you don't use. It can also be bundled into your Instroom CRM plan at a discounted rate if you want both.",
      },
    },
    {
      '@type': 'Question',
      name: 'Which platforms are supported?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Instagram, TikTok, and YouTube. Post Tracker monitors both hashtag usage and direct brand mentions across all three platforms simultaneously.',
      },
    },
    {
      '@type': 'Question',
      name: "Can agencies manage client brands without a separate subscription?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: "Yes. If a brand already has a Post Tracker subscription, they can approve your access request. You manage their account from your own login — no separate payment, no switching accounts, no friction.",
      },
    },
    {
      '@type': 'Question',
      name: "What if an influencer didn't grant usage rights?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Post Tracker still detects and logs the post in your dashboard. Content download is only triggered for influencers where usage rights have been confirmed in your campaign settings.',
      },
    },
  ],
}

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Instroom Post Tracker',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  offers: {
    '@type': 'Offer',
    price: '29',
    priceCurrency: 'USD',
  },
  description:
    'Influencer post monitoring tool that automatically tracks hashtags and mentions, downloads content to Google Drive, and builds your UGC library on autopilot.',
}

export default function MarketingPage() {
  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Full-page grid texture */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(var(--marketing-grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--marketing-grid-color) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <HeroSection />
      <PainSection />
      <HowItWorksSection />
      <FeaturesSection />
      <ComparisonSection />
      <WhoSection />
      <PricingSection />
      <FaqSection />
      <CtaSection />
    </>
  )
}
