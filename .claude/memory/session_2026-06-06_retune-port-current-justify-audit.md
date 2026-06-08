---
name: Retune-port doc 11 - current Justify Manipulate audit
description: Module-by-module audit of justify/core/manipulate vs Retune source, with React-vs-vanilla architecture call
type: reference
relates_to: [session_2026-06-06_justify-roundtrip-CLOSED.md]
---

Jonah. Wrote `justify/docs/retune-port/11-current-justify-audit.md` - an exhaustive audit of the current Manipulate (Design panel) implementation against Retune, with per-module fresh-rewrite-vs-reconcile verdicts.

Sourcing reality found during the audit: the only Retune artifact on disk is the published README (`/Users/spare3/Documents/Github/retune/README.md`). The `packages/overlay/src` `.tsx` source named in the task brief is NOT present. So every "Retune says" claim is anchored to a README line, and `icons.ts` (self-described as verbatim-extracted from "reference tool v0.7.6") is the closest tie to real Retune source.

Per-module verdicts recorded:
- `index.ts` - reconcile (light): plumbing sound; fix panel-recreate-on-select state loss (tab resets every click); unify hover-label inline icons with icons.ts.
- `property-panel.ts` (2841 lines) - reconcile structure / rewrite dead controls. ~8 controls are visually present but behaviorally DEAD: Trigger select (empty cb), 4x split buttons (no handler), aspect-ratio lock (sets unused bool), font-family picker (opens nothing), combo-input unit chevron (decorative), filter slider (click-only no drag), scope pill (single hardcoded "This instance"), grid controls (GRID_CONTROLS detected but no UI built). Missing Retune sections: Video, SVG shapes, background-image, object-position/alt/loading, light theme + toggle.
- `box-model.ts` - ORPHANED (not imported anywhere). Decide wire-in vs delete; colors hardcoded (#f97316/#22c55e/#93c5fd).
- `state-toggle.ts` - ORPHANED + off-palette (#2a2a3e/#888/#D97757, not the cssVars tokens). Fresh-rewrite: fold into panel Trigger row, delete file.
- `control-detector.ts` - reconcile: group detection used, but the detailed ControlDefinition[] arrays are ignored (panel hardcodes its own). IMAGE_CONTROLS defined but no image section ever built.
- `handles.ts` - reconcile + verify: edits padding/margin/radius (not width/height resize as Retune's "resize by dragging" implies); scrub math diverges from scrub.ts (delta/2*step vs round(dx/2)*step); confirm not orphaned.
- `scrub.ts` - KEEP. Exact Retune behavioral match (Shift=10x, Alt=0.1x, steps=round(dx/2)).
- `icons.ts` (777 lines) - KEEP. Verbatim Retune v0.7.6 extraction; canonical asset layer. Many exports unused (map to controls not yet built).

Architecture call (the headline): RECOMMEND staying imperative DOM (Option B), NOT bundling Preact. Why: the "port .tsx near-verbatim" rationale for Preact collapses because there is no Retune .tsx source on disk - only a README - so Preact buys a framework but no copy-paste shortcut. Justify's ENTIRE overlay (toolbar/claudebar/queuebar/changes-panel/prompt-mode) is already imperative in one esbuild IIFE (globalName Justify, target es2022, no JSX loader); adding Preact makes Manipulate the only React-island = split-brain maintenance seam exactly where Retune-parity churn concentrates. property-panel.ts is already ~90% structural fidelity imperatively; remaining work is additive reconcile. Option C (50-line hyperscript h()+patch, no VDOM) is the escape hatch if section count grows. Revisit Option A only when real Retune packages/overlay/src .tsx files are actually obtained locally.

Token system captured exactly in the doc: PANEL_WIDTH=280, FONT_FAMILY 'JustifySans',system-ui,sans-serif, EASING cubic-bezier(0.23,1,0.32,1), the 12 --justify-* dark-theme color-mix tokens, blue #0D99FF, surface color-mix(in srgb,#1c1917 95%,#ffffff). Hardcoded-color drift flagged: #D97757 position dot, #0D99FF/#a8a29e in alignment grid, box-model + state-toggle palettes.

Files touched:
- created /Users/spare3/Documents/Github/claude-dotfiles/justify/docs/retune-port/11-current-justify-audit.md
