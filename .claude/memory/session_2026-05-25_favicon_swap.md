---
name: session-2026-05-25-favicon-swap
description: Extract the ampersand path from the Yes& brand SVG and use it as the marketing-site favicon. Replaces the prior text-based "&" placeholder favicon.
type: project
relates_to: [session_2026-05-25_mobile_nav.md, session_2026-05-25_marketing_site_expansion.md]
---

Human collaborator: Jonah.

## Source

`/Users/spare3/Downloads/vectorized_019e612f-97ba-73ed-8d92-a5766a7c2173.svg` - the full Yes& wordmark vectorized. Four paths: three ink-color (#002425) for y/e/s letters, one brand-red (#DA1A09) for the ornate ampersand. ViewBox 141.7 x 71.3.

## Change

`marketing-site/assets/favicon.svg`: was a text-based fallback `<text>&amp;</text>` in serif. Now: the actual ampersand path from the brand SVG, extracted and centered in a 64x64 cream rounded square. Same surface color (#F4EFE4) as the brand canvas, ampersand fill in the brand red.

Transform applied: `translate(-83, 6) scale(0.96)` to crop the ampersand region of the source path and fit the 64x64 favicon viewBox with breathing room. May need tuning after visual verification.

About to verify in browser at /favicon.svg + as the browser tab icon.