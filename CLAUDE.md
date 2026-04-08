# CLAUDE.md — Instroom Post Tracker

> **This is the single source of truth for Claude Code working on this codebase.**
> Read this entire file before writing any code. Then read the referenced docs in order.

---

## What Is Instroom Post Tracker?

Instroom Post Tracker is a **multi-tenant B2B SaaS** for influencer marketing agencies. It automatically:

1. **Detects** influencer posts via the **Ensemble** social monitoring API (webhook)
2. **Downloads** content to a structured **Google Drive** folder (TikTok: best available CDN stream — creator handle overlay still present; Instagram: clean)
3. **Gates** downloads behind a **usage rights** toggle — per influencer, per campaign
4. **Fetches performance metrics** 7 days after publish (frozen, never updated)
5. **Calculates EMV** (Estimated Media Value) using configurable CPM rates per platform
6. **Tracks Instagram collab tag** status per post

**3-Tier Hierarchy:** Instroom platform (super admin) → **Agencies** → brand **workspaces** → many **campaigns** → many **influencers + posts**.

**Workspace creation:** Agency invites a brand via the **Invite Brand** dialog → brand receives an emailed link (or the agency copies it manually) → brand completes a public form at `/brand-invite/[token]` (no auth required) → workspace is auto-created with the agency as owner. The manual `/onboarding` page exists **for local development only** and must be disabled in production.

---

## Required Reading — Before Any Code

| # | File | When to read |
|---|------|-------------|
| 1 | `docs/PRD.md` | Understand the product: what, why, who |
| 2 | `docs/ARCHITECTURE.md` | System design, App Router structure, data flow |
| 3 | `docs/DATABASE.md` | Full schema, RLS, enums, query patterns |
| 4 | `docs/WORKFLOWS.md` | Post detection, download, metrics, campaign lifecycle |
| 5 | `docs/DECISIONS.md` | Locked architectural decisions — read before questioning anything |
| 6 | `docs/TODO.md` | Active build backlog in priority order |

---

## Tech Stack — Locked, Do Not Change

```
Framework:      Next.js 15 (App Router) + TypeScript strict mode
Styling:        Tailwind CSS + Instroom design tokens (see DESIGN_SYSTEM.md)
UI atoms:       Custom components in components/ui/ (NOT raw shadcn-cli install)
Database:       Supabase — Postgres + Auth + RLS + pg_cron
Auth:           Supabase Auth via @supabase/ssr (cookie-based, App Router compatible)
Client state:   Zustand (workspace context) + TanStack Query v5 (server data cache)
Forms:          React Hook Form + Zod
Animations:     Framer Motion (sparingly — rules in DESIGN_SYSTEM.md §7)
Post ingestion: Ensemble (external API + cron-based polling)
File storage:   Google Drive via service account (not per-user OAuth)
Deployment:     Vercel (Edge Middleware + Cron Jobs)
```

---

## Absolute Rules

### 1. Server Components by default

Every page and layout is a React Server Component (RSC) unless it requires browser APIs, event handlers, or React hooks. Add `'use client'` only to the **smallest possible subtree**.

```tsx
// ✅ RSC — default for all pages/layouts
export default async function CampaignsPage({ params }: PageProps) {
  const { workspaceSlug } = await params
  const supabase = await createClient()
  // fetch + return JSX
}

// ✅ Client Component — only when interactivity is genuinely needed
'use client'
export function FilterBar() {
  const [filter, setFilter] = useState('all')
}
```

### 2. Two Supabase clients — strict separation

```typescript
import { createClient }        from '@/lib/supabase/server'   // user session, RLS auto-enforced
import { createServiceClient } from '@/lib/supabase/server'   // admin, bypasses ALL RLS
```

`createServiceClient()` is **only** allowed in:
- `app/api/cron/posts-worker/route.ts` — reads+writes posts via polling
- `lib/actions/workspace.ts` — workspace creation (no membership row exists yet)
- `lib/actions/workspace.ts` — invitation acceptance (invitee isn't a member yet)
- `lib/actions/agencies.ts` — agency creation, request approval, and brand invite acceptance (workspace creation crosses user boundaries)

**Never use the service client in a component that renders UI. This is a data-isolation violation.**

### 3. All mutations are Server Actions — no REST routes for mutations

All user-triggered mutations use `'use server'` functions in `lib/actions/*.ts`.

```typescript
// ✅ lib/actions/campaigns.ts
'use server'
export async function createCampaign(...): Promise<{ error: string } | void> { ... }
```

`app/api/` is only for: Vercel Cron handlers.

### 4. Design tokens only — never hardcoded colours

```tsx
// ✅ Correct
className="bg-background-surface text-foreground border border-border rounded-xl"

// ❌ Wrong — will break dark mode and violates the design system
className="bg-white text-gray-900 border-gray-200 rounded-xl"
```

See `docs/DESIGN_SYSTEM.md` for all token names. See `styles/globals.css` for definitions.

### 5. Zod validates all user input before DB writes

Every Server Action parses its input with a Zod schema from `lib/validations/index.ts` before any database operation.

```typescript
const parsed = createCampaignSchema.safeParse(data)
if (!parsed.success) return { error: parsed.error.errors[0].message }
// only then: write to DB
```

### 6. RLS is the only data-isolation layer

Do not write `where workspace_id = X` guards in Server Components as security measures. Supabase RLS policies enforce isolation at the database level. Middleware enforces authentication at the edge. Components do not need to check either.

### 7. TypeScript strict mode — no `any`

`"strict": true` in tsconfig. Use `unknown` + type narrowing or generate Supabase types (`npm run db:generate`). `any` is not acceptable.

### 8. Always parallel-fetch in Server Components

```tsx
// ✅ One round-trip for N queries
const [{ data: campaigns }, { data: influencers }] = await Promise.all([
  supabase.from('campaigns').select('id, name, status').eq('workspace_id', workspaceId),
  supabase.from('influencers').select('id, full_name').eq('workspace_id', workspaceId),
])

// ❌ Sequential round-trips — never do this for independent queries
const { data: campaigns } = await supabase.from('campaigns').select('...')
const { data: influencers } = await supabase.from('influencers').select('...')
```

### 9. Use `@/` import alias — never relative paths

```typescript
// ✅
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

// ❌
import { Button } from '../../../components/ui/button'
```

---

## Directory Structure

```
instroom/
├── app/
│   ├── layout.tsx                         ← Root: fonts (Inter + Manrope), Providers
│   ├── (marketing)/                       ← SSG — no auth, no sidebar
│   │   ├── layout.tsx                     ← Nav + footer only
│   │   ├── page.tsx                       ← Landing page
│   │   └── request-access/
│   │       ├── page.tsx                   ← Public form: Brand tab + Agency tab
│   │       └── request-access-tabs.tsx    ← Client component — tab switcher + forms
│   ├── (auth)/                            ← Auth pages — minimal layout
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/route.ts              ← OAuth/magic-link code exchange
│   ├── admin/                             ← Platform admin (is_platform_admin=true only)
│   │   ├── layout.tsx                     ← Admin shell
│   │   ├── page.tsx                       ← Admin dashboard
│   │   └── agencies/
│   │       ├── page.tsx                   ← Agency list + agency request review
│   │       └── [agencyId]/page.tsx        ← Agency detail
│   ├── agency/
│   │   └── [agencySlug]/                  ← Agency shell (agency owner only)
│   │       ├── layout.tsx                 ← Agency sidebar
│   │       ├── dashboard/page.tsx
│   │       ├── brands/page.tsx
│   │       ├── requests/page.tsx          ← Brand request queue (approve/reject)
│   │       └── settings/page.tsx
│   ├── (app)/
│   │   └── [workspaceSlug]/
│   │       ├── (dashboard)/
│   │       │   ├── layout.tsx             ← THE auth boundary: validates membership, renders AppShell
│   │       │   ├── error.tsx              ← Error boundary for all dashboard routes
│   │       │   ├── overview/page.tsx
│   │       │   ├── campaigns/
│   │       │   │   ├── page.tsx
│   │       │   │   └── [campaignId]/page.tsx
│   │       │   ├── influencers/page.tsx
│   │       │   ├── posts/page.tsx
│   │       │   ├── analytics/page.tsx
│   │       │   └── settings/page.tsx
│   ├── api/
│   │   └── cron/
│   │       ├── posts-worker/route.ts      ← Vercel Cron — every 30 min (poll EnsembleData)
│   │       ├── download-worker/route.ts   ← Vercel Cron — every 5 min
│   │       └── metrics-worker/route.ts   ← Vercel Cron — every 10 min
│   ├── app/page.tsx                       ← Redirect: admin→/admin, agency→/agency/[slug]/dashboard,
│   │                                         member→/[slug]/overview, else→/no-access
│   ├── brand-invite/[token]/page.tsx      ← Public brand onboard form (no auth required)
│   ├── invite/[token]/page.tsx            ← Public invite acceptance (team members)
│   └── onboarding/page.tsx               ← DEV ONLY: Manual workspace creation (disable in production)
│
├── components/
│   ├── ui/                               ← Atoms (Button, Badge, Input, Select, Dialog, Tooltip, TagInput…)
│   ├── layout/                           ← AppShell, Sidebar, PageHeader, WorkspaceSwitcher, UserMenu
│   ├── admin/                            ← Admin-specific components (agency list, request review)
│   ├── agency/                           ← Agency shell components (agency sidebar, invite-brand-dialog)
│   ├── dashboard/                        ← StatCards, CampaignsTable, RecentPostsGrid, UsageRightsPanel
│   ├── campaigns/                        ← CreateCampaignDialog, TrackingConfigPanel, CampaignInfluencersList, CampaignPostsTable
│   ├── influencers/                      ← InfluencerTable, AddInfluencerDialog
│   ├── posts/                            ← PostsTable, PostsFilterBar, CollabStatusSelect, DownloadStatusBadge
│   ├── analytics/                        ← PostVolumeChart, EmvChart, PlatformBreakdown, ErBenchmarkChart, InfluencerLeaderboard, EmvConfigForm
│   ├── settings/                         ← WorkspaceSettingsForm, MemberTable, InviteMemberDialog, EmvSettingsPanel
│   └── providers/                        ← QueryProvider, ThemeProvider
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts                     ← createClient() + createServiceClient()
│   │   └── client.ts                     ← createBrowserClient()
│   ├── actions/                          ← Server Actions — one file per domain
│   │   ├── auth.ts
│   │   ├── agencies.ts                   ← submitAgencyRequest, approveAgencyRequest, rejectAgencyRequest, inviteBrand, acceptBrandInvite, getAgencies, getActiveAgenciesPublic
│   │   ├── workspace.ts
│   │   ├── campaigns.ts
│   │   ├── influencers.ts
│   │   ├── posts.ts
│   │   └── usage-rights.ts
│   ├── hooks/
│   │   ├── use-workspace-store.ts        ← Zustand with persist
│   │   └── use-debounce.ts
│   ├── types/
│   │   ├── index.ts                      ← All domain types
│   │   └── supabase.ts                   ← GENERATED — run: npm run db:generate
│   ├── utils/
│   │   └── index.ts                      ← cn(), formatters, toSlug
│   ├── validations/
│   │   └── index.ts                      ← All Zod schemas
│   └── drive/
│       └── upload.ts                     ← Google Drive upload utility
│
├── styles/
│   └── globals.css                       ← CSS variable definitions (all design tokens)
│
├── supabase/
│   └── migrations/
│       ├── 0001_initial_schema.sql       ← Full schema, RLS, triggers, indexes, pg_cron jobs
│       ├── 0002_brand_requests.sql       ← Brand request flow + Drive columns
│       └── 0011_multi_agency_platform.sql ← agencies, agency_requests, is_platform_admin, agency_id FKs, brand role
│
├── docs/                                 ← This folder — all project documentation
├── proxy.ts                              ← Edge middleware (Next.js 16 convention — not middleware.ts)
├── tailwind.config.ts                    ← Semantic token → Tailwind class map
├── next.config.ts
├── tsconfig.json
├── package.json
├── vercel.json                           ← Cron job schedule definitions
└── .env.local                            ← Copy from .env.local.example, fill all values
```

---

## Naming Conventions

| Thing | Convention | Example |
|-------|-----------|---------|
| React components | PascalCase | `CampaignPostsTable` |
| Component files | kebab-case.tsx | `campaign-posts-table.tsx` |
| Skeleton files | `*-skeleton.tsx` | `stat-cards-skeleton.tsx` |
| Server Action files | kebab-case.ts | `lib/actions/campaigns.ts` |
| Server Action functions | camelCase verbs | `createCampaign`, `toggleUsageRights` |
| Supabase tables | snake_case plural | `campaign_influencers` |
| Tailwind classes | Token names from config | `bg-background-surface` |
| Custom hooks | `use-` prefix kebab | `use-workspace-store.ts` |
| Route groups | `(group)` | `(dashboard)`, `(auth)` |
| Page types | `PageProps` interface | `interface PageProps { params: Promise<{ ... }> }` |

---

## Key Patterns — Quick Reference

### Server Component with data fetch
```tsx
interface PageProps {
  params: Promise<{ workspaceSlug: string }>
}

export default async function Page({ params }: PageProps) {
  const { workspaceSlug } = await params
  const supabase = await createClient()

  const workspace = await supabase
    .from('workspaces').select('id').eq('slug', workspaceSlug).single()
  
  const [{ data: campaigns }, { data: posts }] = await Promise.all([
    supabase.from('campaigns').select('id, name, status').eq('workspace_id', workspace.data!.id),
    supabase.from('posts').select('id, platform').eq('workspace_id', workspace.data!.id).limit(10),
  ])

  return <ClientComponent campaigns={campaigns ?? []} posts={posts ?? []} />
}
```

### Server Action
```typescript
'use server'
export async function updateThing(
  workspaceId: string,
  data: UpdateThingInput
): Promise<{ error: string } | void> {
  // 1. Validate
  const parsed = updateThingSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  // 2. Auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 3. Role check (if needed — RLS also enforces this)
  const { data: member } = await supabase
    .from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).single()
  if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
    return { error: 'Insufficient permissions.' }
  }

  // 4. Mutation
  const { error } = await supabase.from('things').update(parsed.data).eq('id', data.id)
  if (error) return { error: 'Failed to update.' }

  // 5. Revalidate
  revalidatePath('/[workspaceSlug]/(dashboard)/things', 'page')
}
```

### Client Component calling a Server Action
```tsx
'use client'
export function MyForm({ workspaceId }: { workspaceId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(data: FormInput) {
    setError(null)
    startTransition(async () => {
      const result = await updateThing(workspaceId, data)
      if (result?.error) {
        setError(result.error)
        return
      }
      // success — revalidation handles UI update
    })
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      <Button variant="primary" size="md" loading={isPending}>Save</Button>
    </form>
  )
}
```

### Optimistic update (toggle pattern)
See `components/dashboard/usage-rights-panel.tsx` for the canonical implementation using `useOptimistic`.

### Suspense + Skeleton
```tsx
// Server Component page
import { Suspense } from 'react'
import { StatCards } from '@/components/dashboard/stat-cards'
import { StatCardsSkeleton } from '@/components/dashboard/stat-cards-skeleton'

export default function Page() {
  return (
    <>
      <Suspense fallback={<StatCardsSkeleton />}>
        <StatCards workspaceId={workspaceId} />
      </Suspense>
    </>
  )
}
```

---

## Environment Variables

| Variable | Required for | Source |
|----------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | All | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | All | Supabase project → Settings → API (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Posts worker, workspace creation | Supabase project → Settings → API (service role — **never expose to browser**) |
| `NEXT_PUBLIC_APP_URL` | Invite links | e.g. `https://app.instroom.co` |
| `ENSEMBLE_API_KEY` | Posts scraping, download + metrics API | From Ensemble dashboard |
| `GOOGLE_SERVICE_ACCOUNT_JSON_B64` | Drive upload | Base64 of service account JSON file |
| `CRON_SECRET` | Vercel Cron auth | Random secret — `openssl rand -hex 32` |

---

## npm Scripts

```bash
npm run dev           # Start dev server on localhost:3000
npm run build         # Production build (runs type check)
npm run lint          # ESLint
npm run type-check    # tsc --noEmit (no artifacts)
npm run db:generate   # Regenerate lib/types/supabase.ts from live schema
npm run db:push       # Push migration files to Supabase via CLI
```

---

## Pre-Coding Checklist

Before writing any code:

- [ ] Read all docs in the order listed above
- [ ] Check `docs/TODO.md` — is this already queued? Follow priority order
- [ ] Check `docs/DECISIONS.md` — has this pattern already been decided?
- [ ] Check `docs/COMPONENTS.md` — does a component for this already exist?
- [ ] Know the token names — open `styles/globals.css` and `tailwind.config.ts`
- [ ] Run `npm run db:generate` if writing new Supabase queries
- [ ] Confirm: does the new list/table component have an **empty state**?
- [ ] Confirm: does the new data component have a **skeleton sibling** for Suspense?
- [ ] Confirm: no hardcoded colours (use `grep -r "bg-white\|text-gray" components/` to check)
