Build me a **stunning, production-quality 3D landing page** for a B2B SaaS product called **Instroom Post Tracker**. This lives inside an existing Next.js 15 App Router project. Use the exact tech stack already in place — no new dependencies unless absolutely necessary.

---

### Tech Stack (already installed — do not change)

- **Framework:** Next.js 16.1.6 App Router + TypeScript strict mode + React 19
- **Styling:** Tailwind CSS using the project's semantic design tokens (defined in `tailwind.config.ts` and `styles/globals.css`) — never use raw hex values or hardcoded colors
- **Animations:** Framer Motion — use it for scroll-triggered reveals, floating elements, hover effects, and staggered entrance animations
- **Fonts:** Manrope (`font-display`, already configured via CSS variable `--font-manrope`) for all headings; Inter (`font-sans`, `--font-inter`) for body copy — both imported in the root layout, use `font-display` and `font-sans` Tailwind classes
- **Components:** Custom UI atoms live in `components/ui/` — use them where they exist rather than rebuilding
- **Icons:** Use `lucide-react` (already installed, v0.487.0) — import named icons directly, e.g. `import { Radar, Shield, CloudDownload } from 'lucide-react'`

The landing page file is: `app/(marketing)/page.tsx`
The marketing layout (nav + footer) is: `app/(marketing)/layout.tsx`

---

### Design Tokens Available (use these — never hardcode colors)

```
bg-background              → #F7F9F8 (app canvas) — NOT used for this dark page
bg-background-surface      → #FFFFFF
bg-background-overlay      → brand-dark — sidebar deep green
text-foreground            → #1E1E1E
text-foreground-light      → secondary labels
text-foreground-lighter    → captions, hints
text-foreground-muted      → placeholders
border-border              → card borders
brand                      → #1FAE5B — primary green (CTAs, glows, active)
brand-muted                → light green tint
brand-dark                 → #0F6B3E — deep forest green (authority, depth)
destructive                → #E24B4A — used for "old way" contrast
```

**For the dark page canvas:** use inline CSS or a Tailwind arbitrary value `bg-[#091810]` (slightly green-tinted near-black) — this is intentionally outside the token system as it's a marketing-only value.

---

### Who This Is For

Instroom Post Tracker serves two audiences:

1. **Influencer marketing agencies** — the buyers. They manage dozens of brand clients and run influencer campaigns across Instagram, TikTok, and YouTube. They're tired of chasing posts manually, downloading watermarked content, and building spreadsheets to prove ROI.
2. **Brand marketing teams** — the end users inside each workspace. They track posts day-to-day, download content for repurposing, and report performance to leadership.

The hero addresses the agency problem. The features section speaks to both.

---

### Mission, Vision & Goals

**Mission:**
Instroom Post Tracker gives influencer marketing agencies total control over every campaign post — from the moment it goes live to the moment it earns. No more manual downloads, no more missing links, no more waiting to know what's performing.

**Vision:**
A world where influencer marketing agencies operate with the precision of performance media — every post tracked, every right secured, every metric captured automatically — so agencies spend their time on strategy, not spreadsheets.

**Core Product Goals (use these to write all feature copy):**
1. **Zero-miss post detection** — every influencer post across Instagram, TikTok, and YouTube is automatically detected the moment it goes live, matched to the right campaign, and logged — no human intervention required.
2. **Rights-gated content downloads** — watermark-free downloads are gated behind a usage rights toggle per influencer, per campaign. Content only lands in Google Drive when rights are secured.
3. **Frozen, honest performance metrics** — engagement data is captured exactly 7 days after publish and never updated. Performance is what it was — not inflated, not cherry-picked.
4. **Automatic EMV calculation** — Estimated Media Value calculated per post using configurable CPM rates per platform, giving agencies a clean number for every client report.
5. **One workspace per brand, one agency above all** — a clean multi-tenant hierarchy where the agency sees everything and each brand sees only their own world.

---

### Design Direction: Dark Forest Glassmorphism

Overall aesthetic: **dark, premium, bold** — like Framer or Webflow. Creative-industry software agencies are proud to show clients.

**Page canvas:**
- Background: `bg-[#091810]` — near-black with a green tint
- Radial gradient overlays in deep emerald at key scroll positions (behind hero, behind features): implemented as absolutely-positioned `div`s with `bg-[radial-gradient(ellipse_at_center,_rgba(15,107,62,0.3)_0%,_transparent_70%)]`
- Very faint diagonal grid texture across the full page: a repeating CSS background pattern using Tailwind arbitrary values — `bg-[linear-gradient(rgba(31,174,91,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(31,174,91,0.04)_1px,transparent_1px)] bg-[size:60px_60px]`

**Glass cards — the signature element:**
Every feature card, step card, and content panel uses this Tailwind class combination:
```
bg-white/5 backdrop-blur-xl border border-brand/20 rounded-[20px]
shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]
hover:border-brand/50 hover:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_40px_rgba(31,174,91,0.12),inset_0_1px_0_rgba(255,255,255,0.08)]
transition-all duration-300
```

**Hero 3D dashboard mockup:**
Build entirely in JSX/Tailwind — no images needed. It must:
- Be a Framer Motion component with `style={{ perspective: 1200 }}` on the wrapper
- Inner panel: `rotateX: 12, rotateY: -8` via Framer Motion `motion.div`
- Animate with infinite `y: [0, -8, 0]` loop on a 6s ease-in-out cycle using `useAnimation` or `animate` prop
- Show a simplified realistic dashboard UI inside: sidebar nav items, a 4-stat card grid ("847 Posts Detected", "94% Downloaded", "€124,500 EMV", "12 Campaigns Active"), and a mini posts table with 3 rows including platform badges (Instagram purple, TikTok blue, YouTube red using the `platform-*` tokens)
- Green diffuse glow beneath: `shadow-[0_60px_120px_rgba(15,107,62,0.4)]`
- Bright-green top edge: `border-t-2 border-brand/60` as a light reflection

**Scroll animations:**
Use Framer Motion `whileInView` with `viewport={{ once: true, amount: 0.2 }}`. Every section heading and card animates from `{ opacity: 0, y: 32 }` to `{ opacity: 1, y: 0 }`. Stagger children using `variants` with `staggerChildren: 0.1`.

---

### Page Sections (build all 9 in order)

#### 1. Navigation Bar
- Position: `fixed top-0 w-full z-50`
- Background: `bg-[#091810]/80 backdrop-blur-md border-b border-brand/10`
- Left: Wordmark — a small `[in]` badge in `bg-brand-dark text-brand text-xs font-bold px-1.5 py-0.5 rounded` + `instroom` in `font-display font-bold text-foreground-lighter` text + `POST TRACKER` in `text-[10px] tracking-widest text-foreground-muted uppercase`
- Right: Nav links (Features, How It Works, Pricing, FAQ) — `text-foreground-lighter hover:text-brand text-sm transition-colors`
- Far right: "Contact Us" button — `bg-brand text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand/90 hover:shadow-[0_0_20px_rgba(31,174,91,0.4)] transition-all`

#### 2. Hero Section
- `min-h-screen flex items-center pt-16` — full viewport, accounts for fixed nav
- Two-column grid: `grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-16 items-center`
- **Left column:**
  - Eyebrow: `text-brand text-xs font-semibold tracking-[0.2em] uppercase` — "INFLUENCER MARKETING INFRASTRUCTURE"
  - H1: `font-display text-5xl lg:text-7xl font-bold text-white leading-[1.1]` — "Every post. Tracked. Downloaded. Measured." — wrap "Measured." in a `span` with a CSS `::after` underline in brand green using Tailwind `relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[3px] after:bg-brand after:rounded-full`
  - Subheading: `text-foreground-lighter text-lg lg:text-xl max-w-xl leading-relaxed mt-6` — the product value prop paragraph
  - CTAs row: Primary "Contact Us" (green solid), Secondary "See How It Works" (ghost with `border border-brand/40 text-brand hover:bg-brand/10`)
  - Trust row: `flex gap-6 mt-8 text-foreground-muted text-xs` — three items: `✓ HMAC-secured webhooks`, `✓ Google Drive integrated`, `✓ Multi-brand workspaces`
- **Right column:** the 3D floating dashboard mockup (Framer Motion component)
- Scroll indicator below hero content: animated chevron or thin line pulsing downward

#### 3. Problem Statement — "The Old Way vs. The New Way"
- Section heading + subheading (centered)
- Large glass card containing a two-column split:
  - **Left — The Old Way:** extra red-tinted border `border-destructive/20`. Title in `text-destructive`. Five pain points with `✗` prefix in `text-destructive`
  - **Right — The Instroom Way:** normal green glass border. Title in `text-brand`. Five solutions with `✓` prefix in `text-brand`

#### 4. Core Features
- Section heading: "Everything your agency needs to run influencer at scale"
- `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- 6 glass feature cards, each with: icon (inline SVG in a `bg-brand/10 rounded-xl p-3 w-12 h-12` wrapper), bold title, description paragraph
  1. Automatic Post Detection (radar SVG icon)
  2. Usage Rights Gating (shield SVG icon)
  3. Watermark-Free Downloads (cloud-arrow-down SVG icon)
  4. Frozen Performance Metrics (lock SVG icon)
  5. EMV Calculation (sparkle SVG icon)
  6. Multi-Brand Workspaces (building-grid SVG icon)
- On hover: icon wrapper pulses with `animate-pulse` class toggled by Framer Motion `whileHover`

#### 5. How It Works
- Section heading: "From post live to performance report — without lifting a finger"
- 4-step horizontal stepper on desktop, vertical on mobile
- Steps connected by animated dashed green lines (CSS `border-dashed border-brand/30`)
- Each step: large faint step number `text-[120px] font-display font-black text-brand/5 absolute` as background, glass card foreground with title + description
  1. Campaign Setup
  2. Post Detection
  3. Rights & Download
  4. Metrics & EMV

#### 6. Social Proof / Testimonials
- Section heading: "Trusted by agencies who've outgrown spreadsheets"
- `grid grid-cols-1 md:grid-cols-3 gap-6`
- 3 glass testimonial cards: quote text, avatar (initials in `bg-brand/20 text-brand rounded-full w-10 h-10 flex items-center justify-center font-bold`), name, title, company
  1. Sophie V. — Head of Influencer, Agency Nord — "We track 200+ influencer posts a month across 12 brand clients. Instroom made that possible without adding headcount."
  2. Marcus T. — Founder, The Collab Studio — "The usage rights gating alone saved us from a licensing dispute that would have cost us a major client."
  3. Priya M. — Campaign Director, Bloom Agency — "Our clients get a Google Drive link and a performance report. No more 'can you send me the content?' emails."

#### 7. Pricing
- Section heading: "Simple pricing for agencies of every size"
- `grid grid-cols-1 md:grid-cols-3 gap-6 items-start`
- Middle card (Growth) elevated with `scale-105` and a `MOST POPULAR` badge (`bg-brand text-white text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full`)
- 3 tiers (placeholder prices — label them as indicative):
  1. **Starter** — €149/mo — 3 workspaces, 5 members, Instagram + TikTok, 30-day history
  2. **Growth** — €349/mo — 10 workspaces, 20 members, all platforms, unlimited history, priority support
  3. **Agency** — €749/mo — Unlimited everything, custom CPM, dedicated onboarding, SLA
- "Contact our team" link below for 50+ client custom plans

#### 8. FAQ
- Section heading: "Common questions"
- 6 accordion items built with Framer Motion `AnimatePresence` + `motion.div` for smooth height animation
- Each item is a glass card with a question header (clicking toggles open) and animated answer body
- Chevron icon rotates 180° on open via `animate={{ rotate: isOpen ? 180 : 0 }}`
  1. How does post detection work?
  2. What platforms are supported?
  3. Where does content get stored?
  4. What happens if usage rights aren't enabled?
  5. How is EMV calculated?
  6. Is there a free trial?

#### 9. Footer
- `border-t border-brand/10 bg-[#091810]`
- 3-column grid: Wordmark + tagline left, nav links center (Product / Company / Platforms), CTA right
- Bottom bar: `© 2026 Instroom. All rights reserved.` — `text-foreground-muted text-xs text-center`

---

### Contact Modal
- Triggered by any "Contact Us" button on the page
- Implemented as a React state-controlled overlay (`fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm`)
- Modal panel: glass card style, centered, max-w-lg
- Fields: Name, Company, Email, Message (all using `bg-white/5 border border-brand/20 rounded-lg text-foreground placeholder:text-foreground-muted` input styles)
- Submit button: brand green solid, `loading` state with spinner
- On submit: show a success state with a green checkmark and "We'll be in touch shortly." — no actual API call needed
- Close on backdrop click or ESC key

---

### File Structure

```
app/(marketing)/
  layout.tsx        ← minimal nav + footer layout (already exists or create)
  page.tsx          ← the landing page (Server Component — mark sections 'use client' only where Framer Motion is used)

components/marketing/
  hero-section.tsx          ← 'use client' — Framer Motion + 3D mockup
  dashboard-mockup.tsx      ← 'use client' — the 3D floating UI
  problem-section.tsx       ← 'use client' — scroll reveal
  features-section.tsx      ← 'use client' — hover + scroll
  how-it-works-section.tsx  ← 'use client' — step stepper
  testimonials-section.tsx  ← 'use client' — scroll reveal
  pricing-section.tsx       ← 'use client' — scroll reveal
  faq-section.tsx           ← 'use client' — accordion
  footer-section.tsx        ← Server Component (static)
  contact-modal.tsx         ← 'use client' — modal state
  marketing-nav.tsx         ← 'use client' — scroll state for nav opacity
```

Keep `page.tsx` as a Server Component that imports and composes all section components. Mark individual section components `'use client'` only where Framer Motion or interactivity is needed.

---

### Rules to Follow

- Use design tokens exclusively — never raw hex values (exception: `#091810` as a marketing-only bg value)
- `font-display` (Manrope) for all headings, `font-sans` (Inter) for all body
- Framer Motion for all animations — no CSS keyframes except for the grid texture background
- Every section component gets a `whileInView` entrance animation
- No `any` in TypeScript — strict mode is enforced
- Use `@/` import alias throughout
- Empty states and skeletons are not required for this static marketing page

---

### Verification

Run `npm run dev` and open `http://localhost:3000`. Confirm:
- All 9 sections render on the landing page at `/`
- Hero 3D dashboard mockup floats and glows with Framer Motion animation
- Scroll reveals fire as each section enters the viewport
- Feature cards glow on hover
- FAQ accordion opens/closes with smooth animation
- Contact modal opens from any CTA, shows form, shows success state on submit
- Fully responsive at 375px, 768px, and 1440px
- `npm run build` passes with no TypeScript errors
