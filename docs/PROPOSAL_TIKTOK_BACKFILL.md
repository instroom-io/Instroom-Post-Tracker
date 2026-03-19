# TikTok Historical Post Backfill — Technical Proposal

**Prepared for:** Management
**Date:** March 18, 2026
**Topic:** Infrastructure upgrade to support full 1-year TikTok post coverage for influencer campaigns

---

## Executive Summary

Instroom Post Tracker automatically scrapes and monitors influencer posts across TikTok, Instagram, and YouTube. For Instagram and YouTube, retrieving a full year of historical posts is straightforward. For TikTok, high-frequency influencers (some posting 5–10× per day) require a smarter approach that conserves API budget while still achieving full coverage.

We have already implemented the correct technical solution — **cursor-based incremental pagination**. The only remaining bottleneck is infrastructure: upgrading from Vercel Hobby to **Vercel Pro** reduces the time to achieve full 1-year backfill from 9 months to 5–6 days.

---

## The Problem

### 1. TikTok API Pagination

The data provider we use (EnsembleData) returns TikTok posts in **pages of approximately 10 posts** per API call. To retrieve older posts, you must request additional pages.

A simple "fetch everything in one call" approach (called a `depth` parameter) has two critical problems:

| Problem | Detail |
|---------|--------|
| **API quota exhaustion** | A single deep fetch for one heavy-posting influencer can consume the entire daily API allowance |
| **Timeout limits** | Fetching hundreds of pages in one request exceeds server time limits |

### 2. High-Frequency Influencers

The number of pages needed to reach 1 year back depends entirely on how often the influencer posts:

| Influencer Type | Posting Rate | Posts in 1 Year | Pages Needed | API Units Used |
|----------------|-------------|----------------|--------------|---------------|
| Heavy poster (e.g. @morgilla) | ~7.4×/day | ~2,700 posts | ~270 pages | ~2,700 units |
| Average influencer | ~1.5×/day | ~548 posts | ~55 pages | ~550 units |
| Light poster | ~3×/week | ~156 posts | ~16 pages | ~160 units |

**Our daily API limit is 1,500 units.** A single heavy-poster fetch would exceed the entire day's budget.

### 3. Why This Matters for Campaigns

Most influencer campaigns have a start date 6–12 months in the past. If we cannot retrieve posts from that period, we miss the very posts the campaign is tracking. This creates a gap in reporting that undermines the value of the platform.

---

## The Solution (Already Implemented)

We have built a **cursor-based incremental pagination system** that solves both problems elegantly.

### How It Works

Instead of fetching all historical posts in one expensive call, the system:

1. **Fetches exactly 1 page (~10 posts)** per scheduled run
2. **Saves a cursor** (a bookmark) in the database pointing to where it left off
3. **Picks up from the cursor** on the next scheduled run
4. **Stops automatically** once it reaches a post older than the campaign's start date
5. **Switches to live monitoring mode** — from that point forward, only new posts are checked

```
Run 1: Fetches posts 1–10   → saves cursor → posts matched: 0
Run 2: Fetches posts 11–20  → saves cursor → posts matched: 0
Run 3: Fetches posts 21–30  → saves cursor → posts matched: 2  ← found #hashtag posts
...
Run 270: Fetches posts 2691–2700 → reached campaign start date → backfill complete
Run 271+: Live monitoring mode — checks only new posts going forward
```

### Key Benefits

| Benefit | Detail |
|---------|--------|
| **Fixed API cost per run** | Always exactly ~10 units regardless of influencer posting frequency |
| **No timeout risk** | Each run completes in seconds |
| **Automatic campaign targeting** | Stops precisely at the campaign start date — no wasted fetches |
| **Resilient** | If a run fails, it simply retries from the saved cursor next time |
| **Zero data loss** | Every post between campaign start and today will eventually be found |

---

## Infrastructure: The Only Remaining Bottleneck

The cursor system is ready. The speed of backfill depends entirely on **how often the cron job runs**.

### Current State: Vercel Hobby Plan

| Parameter | Value |
|-----------|-------|
| Plan | Vercel Hobby (free tier) |
| Cron frequency | Once per day (daily limit on Hobby plan) |
| Cost | $0/month |
| Backfill speed | 1 page per day |

**Time to full backfill at 1 run/day:**

| Influencer Type | Runs Needed | Time to Complete |
|----------------|-------------|-----------------|
| Heavy poster (~7.4×/day) | 270 runs | **~9 months** |
| Average influencer (~1.5×/day) | 55 runs | **~2 months** |
| Light poster (~3×/week) | 16 runs | **~2–3 weeks** |

This means for a campaign tracking @morgilla (who posts 7+ times daily), the platform would not have full coverage for 9 months — rendering historical reporting incomplete for the majority of the campaign window.

---

### Proposed Upgrade: Vercel Pro Plan

| Parameter | Value |
|-----------|-------|
| Plan | Vercel Pro |
| Cron frequency | Every 30 minutes (48× per day) |
| Cost | ~$20/month |
| Backfill speed | 48 pages per day |

**Time to full backfill at 1 run/30 min (48 runs/day):**

| Influencer Type | Runs Needed | Time to Complete |
|----------------|-------------|-----------------|
| Heavy poster (~7.4×/day) | 270 runs | **~5–6 days** |
| Average influencer (~1.5×/day) | 55 runs | **~28 hours** |
| Light poster (~3×/week) | 16 runs | **~8 hours** |

With Vercel Pro, any new influencer added to any campaign reaches full historical coverage within **1 week**, regardless of how frequently they post.

---

## API Cost Analysis

EnsembleData API has a daily limit of **1,500 units** on the current plan.

With cursor pagination at depth=1 (10 posts per run):

| Scenario | Units per run | Runs/day (Hobby) | Runs/day (Pro) | Daily units used |
|----------|--------------|-----------------|----------------|-----------------|
| 1 influencer, Hobby | ~10 | 1 | — | ~10 units |
| 1 influencer, Pro | ~10 | — | 48 | ~480 units |
| 5 influencers, Pro | ~10 each | — | 48 | ~2,400 units* |

*\*At 5 active influencers on Pro, the 1,500 daily unit limit becomes relevant. An EnsembleData plan upgrade (or smart scheduling — only running backfill during off-peak hours) handles this.*

**Note:** Once backfill is complete, an influencer switches to "live monitoring" mode. In live mode, only 1 page is fetched per run to catch new posts — far lower cost than during backfill.

---

## Summary & Recommendation

| | Vercel Hobby (current) | Vercel Pro (proposed) |
|---|---|---|
| **Monthly cost** | $0 | ~$20 |
| **Cron frequency** | 1×/day | Every 30 min |
| **Backfill: heavy influencer** | ~9 months | ~5–6 days |
| **Backfill: average influencer** | ~2 months | ~28 hours |
| **Live monitoring delay** | 24 hours | 30 minutes |
| **New posts detection lag** | Up to 24 hours | Up to 30 minutes |

**Recommendation:** Upgrade to Vercel Pro at $20/month.

This is the minimum cost to deliver on the platform's core promise — complete, up-to-date influencer post tracking. Without it, historical reporting is unavailable for weeks to months after onboarding a new influencer, and new posts are only detected once per day.

The technical implementation is already complete and tested. The upgrade is a single configuration change.

---

## Technical Notes

- The cursor system stores pagination state in the `campaign_influencers` table (columns `tiktok_next_cursor` and `tiktok_backfill_complete`)
- Each cron run processes all active influencers — one page per influencer per run
- Instagram and YouTube do not have this problem — their APIs return the most recent posts efficiently without deep pagination
- Migration applied to production database: 2026-03-18

---

*Document prepared by the Instroom development team.*
