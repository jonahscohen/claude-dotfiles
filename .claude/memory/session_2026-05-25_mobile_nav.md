---
name: session-2026-05-25-mobile-nav
description: Build a real mobile nav for the marketing-site. Failing the user's directive since yesterday - they kept pointing at broken mobile + I kept polishing typography.
type: project
relates_to: [session_2026-05-25_remediation.md, session_2026-05-25_marketing_site_expansion.md]
---

Human collaborator: Jonah.

## Directive

User: "Over here worried about a left border but still can't give me a complete navigation on mobile."

The user has been pointing at this since yesterday. I built the responsive-foundation.md reference, wired flowM into the chain, but never actually shipped a working mobile nav on the marketing-site. The remediation pass graded the site A on typography + bans while leaving the mobile UX broken.

## Confirmed broken at 375px

Screenshot at 375x812 shows:
- Yes& logo pushed OUT of viewport (off-screen left)
- Nav row: "improv sidecoach memory reference" overflowing horizontally, "GitHub" clipped at the right edge
- Page has horizontal scroll
- Hero h1 wraps to 4+ lines because clamp() floor is too high
- Container padding pushes everything off-screen

## Plan

M1: hamburger + drawer mobile nav pattern. Hidden at >= 768px, visible below. Toggle JS + ARIA. Applied to all 5 pages.
M2: fix hero h1 clamp() so it fits at 375px.
M3: verify at 375 / 768 / 1024 + 44x44 hit areas.

## M1 CSS landed

styles.css gets a `.nav-toggle` hamburger button (44x44 hit area, animated to X when open) and a `@media (max-width: 767px)` block that converts `.topbar nav` into a full-screen drawer. JS toggle via aria-expanded + data-mobile-open attribute on the nav element.

## M1 HTML + JS landed

- `marketing-site/nav.js` shipped (~55 lines): toggles aria-expanded + data-mobile-open, closes on Escape, on nav-link click, on resize past breakpoint. Locks body scroll while drawer is open.
- All 5 HTML pages updated: nav gets `id="primary-nav"`, hamburger button inserted after nav, `<script src="nav.js" defer></script>` added to head.

About to fix hero clamp (M2), then visually verify at 375 / 768 / 1024.
## Working state

At 375px: Yes& logo top-left, hamburger top-right, hero h1 in 2 lines (not 4+), no horizontal scroll, install block wraps cleanly.

Tap hamburger -> drawer slides down BELOW the topbar (top: 68px offset). Five nav items stacked vertically in display-serif. Tap X (animated from hamburger) closes the drawer.

At 768px: full inline nav, no hamburger, install block + button side-by-side.

At 1440px: same desktop layout as before, unchanged.

## Gotchas hit + fixes

1. position:sticky on topbar broke when body{overflow:hidden} - sticky needs a scroll container. Switched to position:fixed at narrow widths + 68px body padding-top to compensate.

2. Drawer initially covered the topbar even with higher z-index on topbar - because the nav is a CHILD of topbar, it shares topbar's stacking context. Fixed by setting drawer top:68px instead of top:0, so it starts below the topbar visually.

3. chrome MCP coordinate-based click missed the hamburger at narrow viewport because screenshot pixels vs viewport CSS pixels differ when DPR != 1. Fixed by using find + ref-based click.

## Final state

3 viewports verified: 375 / 768 / 1440. Drawer open + close work via real click on real button. Tasks 138-140 closed.
