---
colors:
  brand:
    ink: "#15140F"
    cream: "#F2EDDF"
    accent: "#5B3DEF"
  status:
    ok: "#117A3B"
    warn: "#A65300"
    error: "#A8071A"
  text:
    primary: "#15140F"
    secondary: "#4F4C44"
    inverse: "#F2EDDF"
  surface:
    canvas: "#F2EDDF"
    raised: "#FAF6EA"
    inverse: "#15140F"
  border:
    soft: "rgba(21,20,15,0.08)"
    firm: "rgba(21,20,15,0.16)"

typography:
  marketing:
    display:
      family: "'Tiempos', 'Source Serif 4', Charter, Georgia, serif"
      weights: [400, 600]
    body:
      family: "'Inter', system-ui, sans-serif"
      weights: [400, 500]
  product:
    display:
      family: "'Inter', system-ui, sans-serif"
      weights: [500, 600]
    body:
      family: "'Inter', system-ui, sans-serif"
      weights: [400, 500]
  mono:
    family: "'JetBrains Mono', ui-monospace, monospace"
    weights: [400, 500]
  scale:
    base: "16px"
    line_height: 1.5
    sizes:
      sm: "14px"
      base: "16px"
      lg: "18px"
      xl: "22px"
      "2xl": "28px"
      "3xl": "40px"
      "4xl": "64px"

rounded:
  sm: "4px"
  md: "8px"
  lg: "16px"

spacing:
  scale: "4px"
  sizes:
    "1": "4px"
    "2": "8px"
    "3": "12px"
    "4": "16px"
    "6": "24px"
    "8": "32px"
    "12": "48px"
    "16": "64px"
    "24": "96px"

shadow:
  sm: "0 1px 2px rgba(21,20,15,0.06)"
  md: "0 4px 12px rgba(21,20,15,0.10)"

motion:
  ease:
    out: "cubic-bezier(0.2, 0, 0, 1)"
    out_expo: "cubic-bezier(0.19, 1, 0.22, 1)"
  duration:
    fast: "120ms"
    base: "200ms"
    marketing_reveal: "560ms"
---

# DESIGN.md

## Color

One palette, two contexts. Marketing surfaces lean into cream-on-ink contrast; dashboard surfaces use raised paper with tighter contrast steps.

## Typography

Register-aware axis: serif display on the marketing surface, neutral sans on the product surface. Mono shared across both for identifiers and metrics.

## Spacing

4px grid throughout. Marketing sections at 96px gaps; dashboard rows at 32px height.

## Components

Marketing: hero, case study, marquee, footer.
Dashboard: sidebar, table, breadcrumb, popover, metric card.
Shared: button, link, focus ring, error message.

## Motion

Marketing: 560ms reveals with exponential easing, all gated on prefers-reduced-motion.
Dashboard: 100-150ms color transitions, no entrance animations.

## States

Same across both registers: scale(0.96) active, 2px accent focus ring, 40% opacity disabled, color is never the sole state signal.
