---
name: Retune port spec 01 - shell and theme
description: Extracted exact shell/theme spec for Retune overlay into retune-port docs
type: reference
---

Wrote /Users/spare3/Documents/Github/claude-dotfiles/justify/docs/retune-port/01-shell-and-theme.md (Jonah).

Reference-extraction subagent task. Covered: shadow-DOM mount, full token palette (black/white opacity ramps, Figma blue + Tailwind red ramps, light/dark semantic tokens), toolbar (44px pill, collapse/expand, drag-snap), panel (280px, calc(100vh-84px), bottom 68px), Elements/Design tab bar + JS-driven pill, Section/Row primitives, tooltip, reduced-motion, icon sources (@central-icons-react/round-outlined-radius-2-stroke-1.5 ^1.1.153), selector-field pills, config defaults (port 9223, hotkey alt+d, MIN_VIEWPORT_WIDTH 768).

Note: content-guard blocked first write because em dashes appeared (mirrored from source comments + my prose). Replaced all em dashes with hyphens. Lesson: pre-strip em dashes when transcribing source verbatim into docs.

Files touched:
- justify/docs/retune-port/01-shell-and-theme.md (new)
