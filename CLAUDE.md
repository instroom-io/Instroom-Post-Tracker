# CLAUDE.md — Instroom Post Tracker

> **This is the single source of truth for Claude Code working on this codebase.**
> Read this entire file before writing any code. Then read the referenced docs in order.

---

## What Is Instroom Post Tracker?

Instroom Post Tracker is a **multi-tenant B2B SaaS** for influencer marketing agencies. It automatically:

1. **Detects** influencer posts via the **Ensemble** social monitoring API (webhook)
2. **Downloads** content watermark-free to a structured **Google Drive** folder
3. **Gates** downloads behind a **usage rights** toggle — per influencer, per campaign
4. **Fetches performance metrics** 7 days after publish (frozen, never updated)
5. **Calculates EMV** (Estimated Media Value) using configurable CPM rates per platform
6. **Tracks Instagram collab tag** status per post

**Hierarchy:** One **marketing agency** (super admin) → many brand **workspaces** → many **campaigns** per workspace → many **influencers + posts** per campaign.

**Workspace creation:** Workspaces are **never manually created by brands**. The agency generates a unique onboarding link per brand. The workspace is auto-created when the brand admin accepts the link (`/onboard/[token]`). The manual `/onboarding` page exists **for local development only** and must be disabled in production.

---

## Required Reading — Before Any Code

| # | File | When to read |
|---|------|-------------|
| 1 | `docs/PRD.md` | Understand the product: what, why, who |
| 2 | `docs/ARCHITECTURE.md` | System design, App Router structure, data flow |
| 3 | `docs/DATABASE.md` | Full schema, RLS, enums, query patterns |
| 4 | `docs/DESIGN_SYSTEM.md` | Every UI decision — MUST read before any component |
| 5 | `docs/COMPONENTS.md` | Component inventory, status, build guides |
| 6 | `docs/WORKFLOWS.md` | Post detection, download, metrics, campaign lifecycle |
| 7 | `docs/DECISIONS.md` | Locked architectural decisions — read before questioning anything |
| 8 | `docs/CODE_STYLE.md` | TypeScript, Tailwind, Server Action patterns |
| 9 | `docs/TODO.md` | Active build backlog in priority order |

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
Post ingestion: Ensemble (external API + HMAC-signed webhook)
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
- `app/api/webhooks/ensemble/route.ts` — writes posts across workspace boundaries
- `lib/actions/workspace.ts` — workspace creation (no membership row exists yet)
- `lib/actions/workspace.ts` — invitation acceptance (invitee isn't a member yet)
- `lib/actions/brands.ts` — brand entry creation + brand invitation acceptance (workspace auto-creation crosses user boundaries)

**Never use the service client in a component that renders UI. This is a data-isolation violation.**

### 3. All mutations are Server Actions — no REST routes for mutations

All user-triggered mutations use `'use server'` functions in `lib/actions/*.ts`.

```typescript
// ✅ lib/actions/campaigns.ts
'use server'
export async function createCampaign(...): Promise<{ error: string } | void> { ... }
```

`app/api/` is only for: `webhooks/ensemble` and Vercel Cron handlers.

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
│   │   └── page.tsx                       ← Landing page
│   ├── (auth)/                            ← Auth pages — minimal layout
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── callback/route.ts              ← OAuth/magic-link code exchange
│   ├── (app)/
│   │   └── [workspaceSlug]/
│   │       └── (dashboard)/
│   │           ├── layout.tsx             ← THE auth boundary: validates membership, renders AppShell
│   │           ├── error.tsx              ← Error boundary for all dashboard routes
│   │           ├── overview/page.tsx
│   │           ├── campaigns/
│   │           │   ├── page.tsx
│   │           │   └── [campaignId]/page.tsx
│   │           ├── influencers/page.tsx
│   │           ├── posts/page.tsx
│   │           ├── analytics/page.tsx
│   │           └── settings/page.tsx
│   ├── api/
│   │   ├── webhooks/ensemble/route.ts     ← POST, service client, HMAC-SHA256 verify
│   │   └── cron/
│   │       ├── download-worker/route.ts   ← Vercel Cron — every 5 min
│   │       └── metrics-worker/route.ts   ← Vercel Cron — every 10 min
│   ├── app/page.tsx                       ← Redirect: → last workspace or /onboarding
│   ├── onboard/[token]/page.tsx           ← PRODUCTION: Brand onboarding acceptance (auto-creates workspace)
│   ├── invite/[token]/page.tsx            ← Public invite acceptance (team members)
│   └── onboarding/page.tsx               ← DEV ONLY: Manual workspace creation (disable in production)
│
├── components/
│   ├── ui/                               ← Atoms (Button, Badge, Input, Select, Dialog, Tooltip, TagInput…)
│   ├── layout/                           ← AppShell, Sidebar, PageHeader, WorkspaceSwitcher, UserMenu
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
│   │   ├── brands.ts                     ← Brand entry creation, token generation, acceptBrandInvitation
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
│   │   └── index.ts                      ← cn(), formatters, verifyEnsembleSignature, toSlug
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
│       └── 0001_initial_schema.sql       ← Full schema, RLS, triggers, indexes, pg_cron jobs
│
├── docs/                                 ← This folder — all project documentation
├── middleware.ts                         ← Edge: session refresh + auth redirect
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
| `SUPABASE_SERVICE_ROLE_KEY` | Webhook, workspace creation | Supabase project → Settings → API (service role — **never expose to browser**) |
| `NEXT_PUBLIC_APP_URL` | Invite links | e.g. `https://app.instroom.co` |
| `ENSEMBLE_WEBHOOK_SECRET` | HMAC webhook verify | From Ensemble dashboard |
| `ENSEMBLE_API_KEY` | Download + metrics API | From Ensemble dashboard |
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
