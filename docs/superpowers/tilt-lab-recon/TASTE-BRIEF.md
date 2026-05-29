# tilt-lab taste elevation - team brief (flagship, near completion)

Goal: elevate the tilt-lab playground UI from "functional raw controls" to flagship taste. The dominant problem (per Jonah): RAW HTML controls + clutter where REAL designed components belong. Replace them; declutter; keep every behavior + test intact. Taste-validated (anti-AI-slop, real-components-over-raw, intentional hierarchy).

## Read first
- tilt-lab/PRODUCT.md + tilt-lab/DESIGN.md - brand + tokens (build against these; reference token values, do not invent new palettes).
- The component-gallery-reference skill for industry-validated patterns of each control (slider, switch, select/segmented, color picker, file dropzone, accordion). The /icon-source skill for icons (ONE library, verbatim path data - Lucide recommended).
- .claude/memory/session_2026-05-29_tilt-lab-ui-fixes.md (the controls already have: focus ring, 40x40 hit, tabular range readout, reduced-motion - PRESERVE these).

## Hard rules
- PRESERVE behavior + contracts: ParamControls onChange(name,value) signature, aria-labels, the tabular range readout, the file->objectURL flow, validateStack gating. The 137 vitest tests must stay green (update tests only if a prop genuinely changes, never to paper over).
- Tokens only: colors/spacing/radii via the DESIGN.md/:root vars. No new raw hex.
- Icons: verbatim path data from ONE approved library (Lucide). Never hand-draw/approximate SVG.
- Co-locate CSS per component (e.g. controls/Slider.css imported by Slider.tsx) so agents do not all edit one shared file. ONLY Agent D edits the global app/src/styles.css.
- Real input only for any verification. tsc + vitest + vite build stay green. No commits, no beats (team-lead). Hyphens not em dashes.

## STRICT file ownership (no two agents share a file)
### Agent A - control primitives (OWNS new dir tilt-lab/app/src/components/controls/ + each component's co-located .css)
Build real, designed, reusable controls, each a small React component with co-located CSS, matching DESIGN.md:
- Slider (range): styled track + fill + thumb, hover/active, the existing tabular `<output>` readout inline. Props mirror current range usage (value/min/max/step/onChange/aria-label).
- Switch (toggle): real sliding switch (not a checkbox), keyboard + aria-checked.
- Select: styled dropdown OR segmented control when options <= 4 (segmented reads as more intentional for small option sets like fit/renderMode). Keep value/options/onChange.
- ColorField: swatch button + label showing the hex; opens the native color input (or a small popover) - looks designed, not a raw `<input type=color>`.
- FileDrop: a real drag-and-drop zone (dashed, "drop image/video or click", shows filename after) wrapping the file input; preserve the URL.createObjectURL(file) -> onChange flow + accept="image/*,video/*".
Export a clean index. Write a focused test per primitive (onChange fires with the right coerced value). Report the prop API for Agent C.

### Agent B - icons + layer stack (OWNS tilt-lab/app/src/components/IconButton.tsx + an icons module + LayerStack.tsx + co-located css)
- Use /icon-source: pick Lucide, copy VERBATIM path data for: chevron-up, chevron-down, trash/x (remove), and any others needed. Build a tiny IconButton (icon + aria-label + 40x40 hit + focus ring + scale-on-press).
- Replace LayerStack up/down/remove TEXT buttons with IconButtons. Keep onRemove/onReorder behavior + disabled states. Keep the param-controls render (Agent C owns ParamControls itself).

### Agent C - ParamControls + declutter (OWNS tilt-lab/app/src/components/ParamControls.tsx + its co-located css)
- Swap the raw range/color/toggle/select/file branches to use Agent A's primitives (import from controls/). Preserve the onChange contract + per-type coercion + the readout.
- DECLUTTER high-param effects: when an effect has many params (e.g. > 8), group them into collapsible sections (accordion) with sensible group names (e.g. Aurora: per-layer colors collapsed by default; Fluid: scene/quality up top, advanced collapsed). A wall of 24 sliders is the clutter to kill. Sensible defaults: first group open, rest collapsed.
- Keep ParamControls.test.tsx green (update only for genuine prop/structure changes).

### Agent D - shell + browse taste (OWNS tilt-lab/app/src/App.tsx + BrowseGrid.tsx + the global app/src/styles.css)
- Declutter + elevate the global shell: spacing rhythm, clearer hierarchy (panel headers, section separation), the top bar, empty states. The preview is the hero - frame it well.
- Elevate the browse effect cards (real card feel: better padding/hover/role chip; consider a tiny role-color dot). Keep search + role filters + onPick.
- Own the global styles.css; integrate cleanly with the co-located component CSS (don't duplicate component rules there).

## After A-D (team-lead): taste-validate (sidecoach taste validator) + /sidecoach polish + Claude-in-Chrome visual pass (desktop + narrow), confirm declutter + real components + tests green.
