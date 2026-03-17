# Instroom Post Tracker — Full E2E Testing Prompt

> **How to use:** Fill in all `[REPLACE]` placeholders at the top of the PROMPT START section with your real test data, then paste the entire PROMPT START section into a new Claude Code session.

**Before you start, have these ready:**
- TikTok handle of the influencer (e.g. `@yillldez`)
- Instagram handle (e.g. `@yillldez`)
- 1–2 campaign hashtags (e.g. `#zippit`, `#zippitbag`)
- 1–2 campaign mentions (e.g. `@Zippit`)
- Campaign start date — far back enough to capture real posts (e.g. `2024-11-01`)
- Campaign end date — can be in the future (e.g. `2025-06-30`)
- A workspace already created via the brand acceptance flow (see below)
- Supabase project running and accessible via MCP
- Dev server running at `http://localhost:3000`
- Logged in as a workspace owner (or able to log in during the test)
- **Vercel Free plan:** No automatic cron jobs — ever. All three pipeline workers must be triggered manually via `curl` with the `CRON_SECRET` from `.env.local`.

**Workspace creation (required before running this test):**
Your workspace must already exist. Create it by:
1. Navigate to `http://localhost:3000/agency/requests`
2. Create a new brand entry to generate an onboarding link
3. Copy the onboarding link and open it (as the brand admin user)
4. Accept the invitation — the workspace is auto-created on acceptance
5. Note the workspace slug (e.g. `acme-beauty`) — you'll use it as the `[REPLACE]` below

---

## PROMPT START

---

Hey Claude — I need you to run a full end-to-end test of Instroom Post Tracker. This covers everything: the public landing page, the auth flow, all dashboard pages, the full data pipeline with real social media scraping, and a complete UI/UX audit. You're going to be methodical, thorough, and you're going to use your tools — Playwright MCP for the browser and Supabase MCP for database verification.

Before we begin, here's what I'm giving you for this test run:

- **TikTok handle:** `[REPLACE: e.g. @yillldez]`
- **Instagram handle:** `[REPLACE: e.g. @yillldez]`
- **Campaign hashtags:** `[REPLACE: e.g. #zippit, #zippitbag]`
- **Campaign mentions:** `[REPLACE: e.g. @Zippit]`
- **Campaign start date:** `[REPLACE: e.g. 2024-11-01]`
- **Campaign end date:** `[REPLACE: e.g. 2025-06-30]`
- **Workspace slug:** `[REPLACE: e.g. acme-beauty]` — already created via brand acceptance flow
- **Dev server:** `http://localhost:3000`

A few rules for this session:
- **Never write directly to the database.** When you need test data in Supabase, generate the SQL and show it to me — I'll paste it in manually.
- Use Supabase MCP only for SELECT queries to verify data. For DELETE/INSERT during setup, generate the SQL for me to run.
- Use Playwright MCP for everything browser-related.
- Invoke the `ui-ux-pro-max` skill when you start the UI/UX audit phases.
- Keep a running issues log as you go. I want a clean summary at the end — **log every error, warning, and console message encountered, not just the ones you consider significant.**

Let's go.

---

### PHASE 0 — Session Setup

Start by reading the project's `CLAUDE.md` file and the memory index at `C:\Users\Admin\.claude\projects\c--Users-Admin-Instroom-Post-Tracker\memory\MEMORY.md`. Get yourself oriented on the current build state, what's been fixed, and what's known to be working. Don't skip this — it'll save you from re-discovering things we already know.

Once you've done that, open the Playwright browser and confirm it can reach `http://localhost:3000`. Take a quick screenshot to confirm the server is up.

---

### PHASE 1 — Landing Page: Full UI/UX Audit

Navigate to `http://localhost:3000`. This is the public marketing landing page.

Invoke the `ui-ux-pro-max` skill now. Use it to guide your review of every section on this page.

Work through the page top to bottom:

**1.1 — Navigation**
- Screenshot the nav. Is the logo rendering correctly (SVG, not broken)? Are nav links visible? Is the CTA button present?
- Resize to tablet (768px) and mobile (375px). Does the nav collapse correctly? Any overflow or horizontal scroll?

**1.2 — Hero Section**
- Screenshot at desktop (1440px), tablet, and mobile.
- Is the hero video playing and framed correctly, or is it cutting off the subject?
- Does the headline read clearly over the video? Enough contrast?
- Are the CTA buttons visible and correctly styled?
- On mobile — does the video hide (`hidden lg:block`)? Does the hero still look good without it?

**1.3 — Problem Section, Features, How It Works**
- Scroll through each section. Screenshot at desktop and mobile.
- Feature cards: grid on desktop, clean stack on mobile?
- "How It Works" steps: numbered with connecting lines on desktop, stacked on mobile?
- All icons rendering? All text readable — no clipping or overflow?

**1.4 — Testimonials, Pricing, FAQ**
- Screenshot each section.
- FAQ accordion: does it open and close? Test at least two items.
- Pricing section: present and readable?

**1.5 — Footer**
- Is there a footer? Links aligned correctly?

**1.6 — Contact Modal**
- Click the main "Contact Us" CTA. Does the modal open?
- Screenshot the open modal. Correctly styled? Has a close button?
- Close it. Did it close cleanly?

**1.7 — Request Access Page**
- Navigate to `http://localhost:3000/request-access`.
- Screenshot it. Form rendering? Consistent styling with the landing page?

Log every visual issue found. Be specific: e.g. "Hero video is cropped at the top on 768px."

---

### PHASE 2 — Auth Pages Audit

**2.1 — Login page**
Navigate to `http://localhost:3000/login`. Screenshot at desktop and mobile.
- Form centered and properly padded?
- Inputs using design tokens (no hardcoded `bg-white` or `text-gray`)?
- Submit empty — does validation fire? Is the error message styled correctly?
- Confirm: there is no "Create workspace" link or onboarding link on this page. Workspace creation happens exclusively via brand invitation acceptance, not from the login page.

**2.2 — Signup page**
Navigate to `http://localhost:3000/signup`. Same checks.

**2.3 — Redirect logic**
Navigate to `http://localhost:3000/app`. Where does it go?
- If logged in and a workspace member: should redirect to `/{workspace-slug}/overview`. ✅ Expected.
- If logged in with no workspace membership: redirects to `/onboarding` (dev-only fallback). ⚠️ This should **not** happen in normal flow — workspaces are created via brand acceptance before testing begins.
- If not logged in: redirects to `/login`. ✅ Expected.

Note what actually happens.

---

### PHASE 3 — Database Reset (Fresh Start)

We test with a clean database so post counts, analytics totals, and empty states are unambiguous.

**3.1 — Snapshot existing data**

Use Supabase MCP to run these SELECTs and show me the results (so we know what we're deleting):

```sql
-- Workspace ID lookup
SELECT id, name, slug FROM workspaces WHERE slug = '[your-workspace-slug]';

-- Existing campaigns
SELECT c.id, c.name, c.status FROM campaigns c
JOIN workspaces w ON w.id = c.workspace_id
WHERE w.slug = '[your-workspace-slug]';

-- Existing influencers
SELECT i.id, i.full_name, i.tiktok_handle, i.ig_handle FROM influencers i
JOIN workspaces w ON w.id = i.workspace_id
WHERE w.slug = '[your-workspace-slug]';

-- Existing posts
SELECT COUNT(*) as post_count, platform FROM posts p
JOIN campaigns c ON c.id = p.campaign_id
JOIN workspaces w ON w.id = c.workspace_id
WHERE w.slug = '[your-workspace-slug]'
GROUP BY platform;

-- Existing post metrics
SELECT COUNT(*) as metrics_count FROM post_metrics pm
JOIN posts p ON p.id = pm.post_id
JOIN campaigns c ON c.id = p.campaign_id
JOIN workspaces w ON w.id = c.workspace_id
WHERE w.slug = '[your-workspace-slug]';

-- Retry queue
SELECT COUNT(*), status FROM retry_queue GROUP BY status;
```

Show me the counts. Wait for me to confirm before generating the delete SQL.

**3.2 — Generate delete SQL**

Generate DELETE statements in the correct FK dependency order:

```sql
-- Step 1: Delete post metrics for this workspace
DELETE FROM post_metrics
WHERE post_id IN (
  SELECT p.id FROM posts p
  JOIN campaigns c ON c.id = p.campaign_id
  JOIN workspaces w ON w.id = c.workspace_id
  WHERE w.slug = '[your-workspace-slug]'
);

-- Step 2: Delete retry queue entries for this workspace
DELETE FROM retry_queue
WHERE post_id IN (
  SELECT p.id FROM posts p
  JOIN campaigns c ON c.id = p.campaign_id
  JOIN workspaces w ON w.id = c.workspace_id
  WHERE w.slug = '[your-workspace-slug]'
);

-- Step 3: Delete posts
DELETE FROM posts
WHERE campaign_id IN (
  SELECT c.id FROM campaigns c
  JOIN workspaces w ON w.id = c.workspace_id
  WHERE w.slug = '[your-workspace-slug]'
);

-- Step 4: Delete campaign_influencers
DELETE FROM campaign_influencers
WHERE campaign_id IN (
  SELECT c.id FROM campaigns c
  JOIN workspaces w ON w.id = c.workspace_id
  WHERE w.slug = '[your-workspace-slug]'
);

-- Step 5: Delete campaign_tracking_configs
DELETE FROM campaign_tracking_configs
WHERE campaign_id IN (
  SELECT c.id FROM campaigns c
  JOIN workspaces w ON w.id = c.workspace_id
  WHERE w.slug = '[your-workspace-slug]'
);

-- Step 6: Delete campaigns
DELETE FROM campaigns
WHERE workspace_id = (
  SELECT id FROM workspaces WHERE slug = '[your-workspace-slug]'
);

-- Step 7: Delete influencers
DELETE FROM influencers
WHERE workspace_id = (
  SELECT id FROM workspaces WHERE slug = '[your-workspace-slug]'
);
```

Show me the SQL. Wait for me to confirm I've run it before moving to Phase 4.

---

### PHASE 4 — Test Data Setup

Setting up data for the pipeline test. Do not write to the database — generate SQL for me to run manually.

**4.1 — Check what already exists**

Use Supabase MCP to confirm the database is clean:

```sql
-- Confirm workspace exists
SELECT id, name, slug FROM workspaces WHERE slug = '[your-workspace-slug]';

-- Should be empty after reset
SELECT c.id, c.name FROM campaigns c
JOIN workspaces w ON w.id = c.workspace_id
WHERE w.slug = '[your-workspace-slug]';

-- EMV config (should be pre-seeded from workspace creation)
SELECT ec.platform, ec.cpm_rate
FROM emv_config ec
JOIN workspaces w ON w.id = ec.workspace_id
WHERE w.slug = '[your-workspace-slug]';
```

**4.2 — Generate setup SQL**

Based on what exists, generate clearly labelled INSERT SQL for:

1. **A new campaign** in the workspace:
   - Name: `"E2E Test Campaign [today's date]"`
   - `platforms = ARRAY['tiktok', 'instagram']`
   - `start_date` = the start date provided above
   - `end_date` = the end date provided above
   - `status = 'active'`

2. **campaign_tracking_configs** — one row per platform (TikTok + Instagram):
   - `hashtags` = the hashtags provided above (stripped of `#`)
   - `mentions` = the mentions provided above (stripped of `@`)

3. **An influencer**:
   - `full_name` = capitalised handle name
   - `tiktok_handle` and `ig_handle` populated
   - Linked to the workspace

4. **A campaign_influencer row**:
   - `usage_rights = true`
   - `monitoring_status = 'pending'`

5. **EMV config rows** (if missing from the SELECT above):
   - TikTok: `cpm_rate = 25.00`
   - Instagram: `cpm_rate = 35.00`

Show me the full SQL. Wait for me to confirm I've run it before moving on.

---

### PHASE 5 — Dashboard Pages Walkthrough

Log in to the workspace. Navigate to `http://localhost:3000/[workspace-slug]/overview`.

For each of the 7 pages below:
- Screenshot at desktop (1440px) and mobile (375px)
- Note layout breaks, overflow, misalignment
- Note empty states — correct message shown?
- Note any obviously wrong data

**Before screenshotting each page — run the duplicate component check first (see Phase 10.1 for instructions).** Flag any duplicates before continuing.

**5.1 — Overview (`/[workspace-slug]/overview`)**
- Stat cards loading with correct counts?
- New campaign listed in campaigns table?
- Recent posts grid empty (expected)?
- Usage rights panel showing our influencer?

**5.2 — Campaigns (`/[workspace-slug]/campaigns`)**
- New E2E campaign listed?
- Click into it — does the detail page load?
- Tracking config showing our hashtags/mentions?
- Influencer listed with usage rights toggle ON?
- Posts table empty (expected)?

**5.3 — Influencers (`/[workspace-slug]/influencers`)**
- Influencer listed with correct TikTok and Instagram handles?

**5.4 — Posts (`/[workspace-slug]/posts`)**
- Empty state message correct?
- Filter bar rendering (platform, campaign, status filters)?

**5.5 — Analytics (`/[workspace-slug]/analytics`)**
- Empty charts showing (not erroring)?
- Summary cards showing zeros — not `null`, `undefined`, or `NaN`?
- Date range filter working?

**5.6 — Settings (`/[workspace-slug]/settings`)**
- Workspace name loading correctly?
- Members table showing at least the owner?
- EMV panel showing our CPM rates?
- Invite dialog opens?

**5.7 — Agency Requests (`/agency/requests`)**
- Navigate to `http://localhost:3000/agency/requests`.
- Page loads? Brand requests table rendering?

---

### PHASE 6 — Trigger the Scraping Pipeline

**There are no automatic cron jobs.** All workers are always triggered manually via `curl`. This is permanent on Vercel Free.

**6.1 — Read the CRON_SECRET**

Use the Read tool to open `.env.local` and extract `CRON_SECRET`.

**6.2 — Call the posts-worker**

```bash
curl -s -X GET "http://localhost:3000/api/cron/posts-worker" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -w "\nHTTP Status: %{http_code}\n"
```

This makes real EnsembleData API calls — can take 30–90 seconds. Wait for the full response. Did it exit 200? What post counts did it report?

**6.3 — Verify scrape results in Supabase**

```sql
-- Were posts detected?
SELECT p.id, p.platform, p.post_url, p.thumbnail_url, p.posted_at,
       p.download_status, p.detected_at, i.tiktok_handle, i.ig_handle
FROM posts p
JOIN influencers i ON i.id = p.influencer_id
JOIN campaigns c ON c.id = p.campaign_id
WHERE c.name LIKE 'E2E Test Campaign%'
ORDER BY p.detected_at DESC
LIMIT 20;

-- What's in the retry queue?
SELECT job_type, status, attempts, scheduled_at, error
FROM retry_queue
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;

-- Did monitoring_status update to 'active'?
SELECT ci.monitoring_status, i.tiktok_handle, i.ig_handle
FROM campaign_influencers ci
JOIN influencers i ON i.id = ci.influencer_id
JOIN campaigns c ON c.id = ci.campaign_id
WHERE c.name LIKE 'E2E Test Campaign%';
```

Report: how many posts detected? On which platforms? Download jobs enqueued?

**6.4 — Check post data quality**

For the detected posts, verify:
- `thumbnail_url` present and not null
- `post_url` is a valid URL
- `caption` populated on at least some posts
- `posted_at` falls within the campaign date range
- `download_status` is `'pending'` (usage_rights is true)

---

### PHASE 7 — Run the Download Worker

Only run this if Phase 6 found posts with `download_status = 'pending'`.

**7.1 — Call the download-worker**

```bash
curl -s -X GET "http://localhost:3000/api/cron/download-worker" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -w "\nHTTP Status: %{http_code}\n"
```

Downloading real content + uploading to Google Drive — wait for the full response.

**7.2 — Verify download results**

```sql
SELECT p.id, p.platform, p.download_status, p.drive_file_id,
       p.drive_folder_path, p.downloaded_at, rq.status as job_status, rq.error
FROM posts p
LEFT JOIN retry_queue rq ON rq.post_id = p.id AND rq.job_type = 'download'
JOIN campaigns c ON c.id = p.campaign_id
WHERE c.name LIKE 'E2E Test Campaign%'
ORDER BY p.detected_at DESC;
```

Did any posts reach `download_status = 'downloaded'`? Do they have a `drive_file_id`? Any failures — what's in `retry_queue.error`?

---

### PHASE 8 — Run the Metrics Worker

Metrics normally wait 7 days post-publish. We need to manually enqueue the jobs.

**8.1 — Generate SQL to enqueue metrics jobs**

Generate this SQL for me to run:

```sql
INSERT INTO retry_queue (post_id, job_type, status, attempts, scheduled_at)
SELECT id, 'metrics_fetch', 'pending', 0, NOW()
FROM posts
WHERE campaign_id = (
  SELECT id FROM campaigns WHERE name LIKE 'E2E Test Campaign%' LIMIT 1
)
AND metrics_fetched_at IS NULL
ON CONFLICT DO NOTHING;
```

Wait for me to confirm I've run it.

**8.2 — Call the metrics-worker**

```bash
curl -s -X GET "http://localhost:3000/api/cron/metrics-worker" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -w "\nHTTP Status: %{http_code}\n"
```

**8.3 — Verify metrics results**

```sql
SELECT pm.post_id, pm.views, pm.likes, pm.comments, pm.shares, pm.saves,
       pm.engagement_rate, pm.emv, pm.emv_cpm_used, pm.fetched_at,
       p.platform
FROM post_metrics pm
JOIN posts p ON p.id = pm.post_id
JOIN campaigns c ON c.id = p.campaign_id
WHERE c.name LIKE 'E2E Test Campaign%'
ORDER BY pm.fetched_at DESC;

SELECT id, platform, metrics_fetched_at
FROM posts
WHERE campaign_id = (
  SELECT id FROM campaigns WHERE name LIKE 'E2E Test Campaign%' LIMIT 1
);
```

Verify for each row:
- `views` is a positive integer (not 0, not null)
- `engagement_rate` is between 0–100 (not 100x inflated — that bug was fixed in commit 962d19f)
- `emv` = `views * (emv_cpm_used / 1000)` — spot-check the math on at least one row
- `emv_cpm_used` matches the CPM we set (25.00 TikTok, 35.00 Instagram)

---

### PHASE 9 — UI Data Verification: DB vs Display

We now have real data. Verify every display surface matches the database.

**9.1 — Posts page (`/[workspace-slug]/posts`)**

Navigate and screenshot the full table. For the first 2–3 posts, cross-reference:
- **Thumbnail** — matches `thumbnail_url` in DB? Or broken/missing?
- **Platform badge** — matches `p.platform`?
- **Posted date** — formatted correctly, matches `posted_at`?
- **Download status badge** — matches `p.download_status`?
- **Views** — matches `pm.views`?
- **Engagement rate** — matches `pm.engagement_rate`? Reasonable % (not 500%)?
- **EMV** — matches `pm.emv`?

Be exact about mismatches: "UI shows 0 views but DB shows 45200 — MISMATCH."

**9.2 — Campaign detail page**

Does the posts table inside the campaign show the same posts? Counts consistent?

**9.3 — Analytics page (`/[workspace-slug]/analytics`)**

Screenshot the full page. Verify each chart:
- **Summary cards** — total posts, total views, total EMV, avg ER. Cross-reference against manual DB sum.
- **Post volume chart** — data points present? Dates make sense?
- **Platform breakdown** — TikTok/Instagram split correct?
- **EMV chart** — total approximately matches sum from `post_metrics.emv`?
- **Influencer leaderboard** — test influencer listed with correct numbers?
- **ER benchmark** — engagement rate value reasonable?

**9.4 — Overview stat cards**

Do the overview cards match posts/analytics data?

---

### PHASE 10 — Full Dashboard UI/UX Audit

Invoke the `ui-ux-pro-max` skill now for the dashboard audit. Apply it to all findings below.

Test every page at three widths: **1440px (desktop), 768px (tablet), 375px (mobile)**. Screenshot any page with layout issues at the failing breakpoint.

**10.1 — Duplicate component check (run this FIRST on every page, before any other check)**

This is the highest-priority bug category. On every page, before anything else:

1. **Take a screenshot** and count interactive elements that appear multiple times
2. **Open browser DevTools → Elements** and search for duplicate DOM nodes with identical content
3. Specifically look for:
   - **Buttons appearing twice** — e.g. "Create Campaign" in both page header and table header
   - **Duplicate dialogs** — two `<dialog>` elements or two modal overlays in the DOM
   - **Page titles or `<PageHeader>` rendered twice**
   - **Duplicate sidebar nav items**
   - **Repeated stat cards** — e.g. 8 cards when 4 are expected
   - **Filter bars appearing twice** — especially on Posts and Analytics
4. **Test interaction:** click one button — do both instances trigger? This confirms true duplication vs. visual coincidence
5. **Flag any duplicate** as a critical bug immediately before continuing

**10.2 — Best practice compliance**

Flag violations on any page:
- **Accessibility:** Interactive elements have labels? Buttons are `<button>` not `<div>`? Images have `alt` text?
- **Semantic HTML:** Appropriate use of `<main>`, `<nav>`, `<section>`? No excessive div soup?
- **Keyboard nav:** Tab through the page — all interactive elements reachable? Visible focus ring present?
- **Error boundary:** Navigate to `/[workspace-slug]/nonexistent` — does the error boundary render cleanly or does the app crash?
- **Consistent spacing:** Sections evenly padded? Nothing bleeding off-screen on mobile?

**10.3 — Design token compliance**

Inspect rendered class names for hardcoded colours:
- Flag any: `bg-white`, `bg-gray-*`, `text-gray-*`, `border-gray-*`
- These must all be design tokens: `bg-background-*`, `text-foreground`, `border-border`

**10.4 — Dark mode**

Toggle dark mode using the theme toggle in the app shell. Screenshot all 7 pages in dark mode.
- Any white backgrounds that should be dark?
- Any text that becomes unreadable?
- Charts and badges correctly themed?

**10.5 — Interactive states**

On each page:
- Hover states on buttons and table rows — visible hover effect?
- Focus states on inputs — visible focus ring?
- Loading states — trigger a loading action, does a spinner/skeleton appear?
- Empty states — confirm empty state messages render correctly throughout

**10.6 — Tables and data density**

On the posts table (with real data):
- Horizontal scroll on mobile (not layout break)?
- Long captions/handles truncated with ellipsis?
- Column widths sensible on all breakpoints?

**10.7 — Charts**

On the analytics page:
- All 5 charts render without errors?
- Axes labeled? Legend visible and legible?
- On mobile: charts scale down, not overflow?

**10.8 — Sidebar / AppShell**

- Desktop: sidebar visible with all nav items?
- Tablet/mobile: sidebar collapses, toggle button present?
- Active nav item highlighted?
- Workspace switcher working?

---

### PHASE 11 — Issues Log and Final Report

Compile everything you've logged into this structured report. **Include every error, warning, and browser console message observed during the session — do not filter or omit anything.**

```
## E2E Test Results — [Date]

### Pipeline Status
- Posts detected: [X] (TikTok: X, Instagram: X)
- Posts downloaded: [X]
- Metrics fetched: [X]
- Data integrity: [Pass / Fail — notes]

### Critical Bugs (blocks functionality)
1. [Description] — [Page/Component] — [Screenshot ref]

### Duplicate Component Bugs
1. [What is duplicated] — [Page] — [How confirmed]

### Best Practice Violations
1. [Violation] — [Page/Component] — [Rule broken]

### Visual / UI Issues
1. [Description] — [Page/Component] — [Breakpoint if relevant]

### Data Mismatches (DB vs UI)
1. [Field] — DB: [X] — UI: [Y] — [Page]

### Responsive Issues
1. [Description] — [Page] — [Breakpoint]

### Dark Mode Issues
1. [Description] — [Page/Component]

### Console Errors & Warnings
1. [Message] — [Page] — [Severity]

### All Clear (verified correct)
- [List everything explicitly confirmed working]
```

After writing the report, check `docs/TODO.md` and flag:
- Which issues are already tracked
- Which are new — suggest a one-line fix description for each

That's the full test. Go.

---

## End of Prompt

---

## Notes for the Tester

- **No auto-cron, ever:** Vercel Free plan — all three workers must be triggered manually with `curl` + CRON_SECRET from `.env.local`. No cron jobs fire automatically at any time.
- **Worker timeouts:** 30–90s is normal for EnsembleData API calls. Don't assume slow = hung.
- **Fresh database:** Always run Phase 3 (Database Reset) before Phase 4. Testing against stale data makes counts untrustworthy.
- **Workspace creation:** Workspaces are never created manually. Use the brand acceptance flow via `/agency/requests` → generate invite link → accept it. The workspace auto-creates.
- **Known regression risk:** ER% was 100x inflated (double-multiplied) — fixed in commit 962d19f. If you see ER > 100%, it's regressed.
- **TikTok thumbnails:** `video.cover` is an object with `url_list[0]`, not a string. Broken thumbnails on TikTok = this.
- **Metrics won't auto-enqueue:** The pg_cron job doesn't fire in testing. Manually INSERT into `retry_queue` as shown in Phase 8.
- **Don't touch novaskin-beauty:** That's the E2E-verified production workspace. Use a freshly created dev workspace for each test run.
