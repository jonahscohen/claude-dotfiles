---
name: New ParamTypes - text + marker-list (globe/ascii parity)
description: Added 'text' and 'marker-list' control types end to end; wired ascii customChars + globe markers; fixed globe cobe-default regression
type: project
relates_to: [session_2026-05-31_parity-interactive-globe-particles-cursor-aurora.md, session_2026-05-31_fidelity_audit_gradients_ascii.md]
---

Collaborator: Jonah

Lifted tilt-lab's ParamType ceiling (was range|color|toggle|select|file) to support two effects that needed richer controls for full original parity.

## Task 1 - 'text' ParamType
- runtime/types.ts: added 'text' to ParamType union; ParamSpec gained optional `placeholder` + `maxLength`.
- runtime/manifest.ts: PARAM_TYPES accepts 'text'; validateParam passes through placeholder/maxLength.
- New primitive app/src/components/controls/TextField.tsx (+ .css): styled single-line input, --input-bg well, hairline --line-2 border, mono metrics, 40px hit area, global focus ring. Emits raw string. Exported in controls/index.ts.
- ParamControls.tsx renders 'text' -> TextField.

## Task 2 - 'marker-list' ParamType
- runtime/types.ts: added 'marker-list'; new Marker type { location:[number,number] /*lat,long*/, size:number } (mirrors cobe's Marker; color left to global markerColor).
- runtime/manifest.ts: PARAM_TYPES accepts 'marker-list'.
- New primitive app/src/components/controls/MarkerListEditor.tsx (+ .css): compact editor - add row (lat/long/size + Lucide plus button) appends; each existing marker has 3 mono number wells + Lucide trash remove. normalize() tolerates malformed input. Emits full Marker[] on every edit. On-brand tokens, 40px icon buttons. Exported in controls/index.ts.
- ParamControls.tsx renders 'marker-list' -> MarkerListEditor.

## Task 3 - wiring
- globe (manifest.json + index.ts): added `markers` marker-list param (default SF+NYC). init prefers an explicit markers array, else the markerSet preset (which keeps overlay labels). setParam('markers', arr) rebuilds cobe's marker buffer via pending.markers. markerSet select retained as quick presets.
- ascii (manifest.json + index.ts): added `customChars` text param (default ''). AsciiState.customChars + STR_KEYS. activePoolFor: a non-empty customChars (>1 char) overrides the charSet ramp; empty reverts to the named preset. The index already accepted literal ramps, so this just exposes typing.

## Globe default regression fix (per user's earlier decision)
Shipped defaults were the cobe README *demo* values (gray #4d4d4d base, #fb6415 marker, dark 1, diffuse 1.2, mapBrightness 6, mapSamples 16000), not cobe's TRUE library defaults.
Why: user wants the shipped default to render cobe's stock look.
How:
- manifest defaults -> mapSamples 10000, mapBrightness 1, diffuse 1, dark 0, baseColor #ffffff, markerColor #ff8000 (mapBaseBrightness 0, glowColor #ffffff, opacity 1 already correct).
- PRESETS['Cobe Default'] rewritten to those true values (kept theta 0.3 for the canonical tilt).
- manifest `preset` default flipped "Custom" -> "Cobe Default"; index init preset fallback + per-param init fallbacks updated to match. So the globe boots to cobe's stock white-globe/orange-marker look regardless of which default path resolves.
- Note: cobe v0.6.5 (installed) is the phenomenon v1 API and does NOT self-default options (the README demo passes them all), so the true-default values live in our manifest/preset, verified against the COBEOptions shape in cobe/dist/index.d.ts.

## Residual gap (flagged)
ascii has NO point-lights feature. The current reimplementation is purely luminance/edge driven; the only "light" tokens are `lightMode` (a boolean invert post-effect) and `shape3dLightShade` (a cube-face shade factor). There is no list of point-lights to expose, and a [lat,long]+size marker-list would not fit screen-space lights anyway. So the ascii `lights` marker-list from the brief was not added - it has nothing to feed. Only the `customChars` text param applies to ascii.

## Verify
- cd tilt-lab/app && npx tsc --noEmit -> 0.
- npm test -> 185/185 green. New tests: TextField (3) + MarkerListEditor (5) render/emit/add/remove; ParamControls text + marker-list (2); globe true-default + marker-list param + live setParam (3 new); ascii customChars param + setParam (2 new).

## Files touched
- runtime/types.ts, runtime/manifest.ts
- app/src/components/controls/TextField.tsx (+.css), MarkerListEditor.tsx (+.css), index.ts
- app/src/components/ParamControls.tsx
- runtime/effects/globe/index.ts, manifest.json
- runtime/effects/ascii/index.ts, manifest.json
- tests: controls.test.tsx, ParamControls.test.tsx, globe/index.test.ts, ascii/index.test.ts
