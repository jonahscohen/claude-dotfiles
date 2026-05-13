---
name: Improv Claude button restyle
description: Replaced sparkle icon with Anthropic logo, removed badge, added pulse animation, hardcoded #D97757
type: project
---

Collaborator: Jonah

## Changes

- Replaced sparkle SVG icon in `_updateClaudeBadge` with the official Claude/Anthropic logo SVG (sourced from lobehub/lobe-icons `claude-color.svg`)
- Removed the `_claudeBadge` span element entirely (number badge)
- Renamed `_claudeBadge` field to `_claudePulseStyle` (unused but keeps field slot)
- Added CSS `improv-claude-btn-pulse` animation: scale 1 -> 1.08 -> 1 with #D97757 box-shadow glow, 2s infinite ease-in-out
- Pulse runs while unreviewed changes exist, button removed when all reviewed
- Hardcoded all accent colors to #D97757 (Claude orange) - no longer uses markerColor/toolbar theme
- SVG uses `fill="#D97757"` and `fill-rule="nonzero"` instead of stroke-based rendering

## Files touched

- `improv/core/index.ts` - `_updateClaudeBadge` method rewritten
- `improv/dist/improv-core.js` - rebuilt via `node build.js --core-only`
- `~/.claude/improv/dist/improv-core.js` - deployed copy
