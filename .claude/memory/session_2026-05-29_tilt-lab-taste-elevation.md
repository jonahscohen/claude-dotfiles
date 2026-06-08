---
name: tilt-lab taste elevation - real components + declutter (tilt-taste team)
description: Flagship taste pass - replace raw HTML controls with designed component primitives (Slider/Switch/Select/ColorField/FileDrop), real Lucide icon buttons, collapsible param groups to kill the param-wall clutter, shell/browse taste. Deployed tilt-taste team.
type: project
relates_to: [session_2026-05-29_tilt-lab-ui-fixes.md, session_2026-05-29_tilt-lab-ui-audit.md, feedback_tilt_lab_fidelity_mandate.md]
superseded_by: session_2026-06-05_tilt-lab-consolidated.md
---

Collaborator: Jonah. 2026-05-29. /sidecoach "taste" (no literal taste flow; it is the taste-VALIDATOR run inside a craft+distill elevation - taste-validator.ts). Jonah: "missed opportunities to use real components in place of clutter all over the screen... flagship near completion."

## The clutter = raw HTML controls
Param panel = bare <input range/color/checkbox/file> + native <select> rows; high-param effects (aurora 24, ascii 25) = a WALL of sliders; layer actions = text buttons "up/down/remove". Elevate to real designed components + declutter.

## Team tilt-taste (4 agents, co-located CSS so no shared-file conflict; ONLY D edits global styles.css)
- A controls/ (NEW): Slider/Switch/Select(segmented when <=4 opts)/ColorField/FileDrop primitives, DESIGN.md tokens, preserve onChange/aria/readout/file-URL contracts + per-primitive test.
- B icons: Lucide VERBATIM paths (/icon-source) + IconButton; LayerStack up/down/remove -> icon buttons.
- C ParamControls: swap raw inputs for A's primitives; COLLAPSIBLE param groups for >8-param effects (kill the wall).
- D shell+browse (owns App.tsx, BrowseGrid.tsx, global styles.css): declutter spacing/hierarchy, elevate cards, frame the preview hero.
Brief: docs/superpowers/tilt-lab-recon/TASTE-BRIEF.md. Hard rules: preserve behavior + 137 tests, tokens-only, verbatim icons, no commits/beats (team-lead).

## After A-D (team-lead): taste-validator + /sidecoach polish + Claude-in-Chrome (desktop + narrow). Then commit + report.
