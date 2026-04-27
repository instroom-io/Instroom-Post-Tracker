# Product

## Register

product

## Users

Influencer marketing agency teams (2–20 people). Account manager, campaign lead, or junior coordinator running 5–30 active campaigns simultaneously. They spend most of their day in the app dashboard — checking posts, toggling usage rights, pulling EMV numbers for client reports. They're not developers. They're deadline-driven and context-switching constantly. Time is the scarcest resource.

## Product Purpose

Multi-tenant B2B SaaS that automatically tracks influencer posts across TikTok and Instagram, downloads content to Google Drive (gated by usage rights), and calculates EMV. Replaces a spreadsheet-and-manual-screenshot workflow that breaks at scale. Success = a campaign manager can go from "Ensemble detected a post" to "client-ready download in Drive" without touching a phone or browser tab outside Instroom.

## Brand Personality

Precise, trustworthy, efficient. The product should feel like a tool that agencies are proud to show clients — not a startup toy, not an enterprise slog. Calm confidence. It does complex things invisibly.

## Anti-references

- Hootsuite / Buffer — clunky, icon-heavy, 2015 marketing tool energy
- Generic SaaS template — purple gradient hero + hero-metric dashboard + identical card grids
- Consumer social apps — Instagram-inspired blobs, gradient avatars, playful rounded shapes (wrong register for agency B2B)
- Salesforce complexity — overwhelming nav depth, endless modals, zero delight

## Design Principles

1. **Invisible complexity** — The system does hard things (API polling, Drive uploads, metrics fetching). The UI should never surface that complexity unless something fails.
2. **Data density without noise** — Agency users read tables fast. Design for scanning, not decoration. Every visual element earns its pixel.
3. **Calm confidence** — Green accent, neutral canvas, Manrope headings. Never shout. The brand is trustworthy because it's quiet.
4. **Progressive disclosure** — Show the minimum needed to act. Complexity reveals only when the user requests it.
5. **Accessible by default** — Agency ops teams include users with accessibility needs. WCAG AA is a floor, not a stretch goal.

## Accessibility & Inclusion

WCAG AA minimum. Known gaps addressed: dialog focus management, table semantics, input focus-visible. Reduced motion respected throughout via useReducedMotion(). Color blindness: status always conveyed through text + color, never color alone.
