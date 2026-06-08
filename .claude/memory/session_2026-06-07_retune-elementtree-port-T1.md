---
name: ElementTree 1:1 port to Preact (T1, Phase A)
description: Created core/manipulate/ui/ElementTree.tsx as a verbatim React->Preact port of Retune's ElementTree (navigator only, no drag)
type: project
relates_to: [session_2026-06-06_retune-port-specs.md]
---

Collaborator: Jonah (jonahscohen@gmail.com)

Task T1 (BUILDER-TREE): port Retune's 923-line ElementTree.tsx into Justify's Manipulate
mode as `core/manipulate/ui/ElementTree.tsx`. Phase A = the 1:1 navigator (no drag wiring).
Spec: justify/docs/retune-port/12-ELEMENTS-TAB.md.

What was done:
- Ported the full file verbatim (logic + all inline <svg> icon path data unchanged). Class
  names kept as `.retune-tree*` so builder-css's CSS matches.
- Kept Retune's exact `import { useState, useCallback, useRef, useEffect, memo } from "react"`
  line. Why: build.js esbuild alias maps `react -> preact/compat` (build.js lines 23-26), so
  all these symbols resolve under Preact without changing the import. Most-verbatim path.
- Import path delta: `getDirectReactComponent` from `../../selector/identifier.js` (was
  `../selector/identifier` in Retune); identifier.ts already has the symbol at line 650.

Mandated fixes applied:
- R2 (Preact events): Retune passed `e.nativeEvent` to onDragStart (its only React-only
  synthetic-event assumption; audited the whole file - that was the one). Under Preact the
  handler receives the native event directly, so changed to
  `onDragStart((e as any).nativeEvent ?? (e as unknown as PointerEvent), element)`.
- R3 (overlay exclusion): rewrote Retune's `isRetuneElement` -> `isJustifyOverlayElement`.
  Justify marks every overlay node with a `data-justify*` attribute (panel host
  `data-justify` via overlay.ts dataset.justify; picker highlight/label/selection/
  parent-indicator/drag-ghost/reparent-line/cursor in selector/picker.ts; freeze/queue in
  freeze.ts/prompt). New check: any attribute named `data-justify` or starting
  `data-justify-` -> excluded, plus `el.closest("[data-justify-host]")` for the picker's
  isolated shadow host. getAttributeNames() loop is future-proof for new markers.
- R8 (brand hygiene): renamed internal `data-retune-tree-key` -> `data-justify-tree-key`,
  kept writer (TreeNode div) and drag hit-test reader (findTargetElement) in sync.

Phase A scope honored: drag machinery is fully present but DORMANT - handleDragStart
early-returns when both onTreeReorder/onTreeReparent are undefined, so pointerdown falls
through to click-select. The wiring teammate omits those two props in A. No dead UI.

Prop signature exposed (for wiring): ElementTreeProps = {
  selectedElement: Element | null; onSelect: (el: Element) => void;
  onHover: (el: Element | null) => void; visualOrderMap?; reparentEntries?;
  onTreeReorder?; onTreeReparent? }. Phase A wires only selectedElement/onSelect/onHover.

Also exported (unit-test surface, unchanged): getVisibleChildren, computeDropIndex,
ReparentEntry.

Verification: `node build.js` succeeds. `npx tsc -p tsconfig.core.json --noEmit` shows ZERO
errors for the new file (remaining errors are pre-existing in prompt/index.ts + toolbar.ts,
other teammates' files). esbuild single-file transform OK.

Comment-only deviation: Retune's source comments use em-dashes; the content-guard hook bans
them, so em-dashes in COMMENTS were replaced with hyphens. Logic and icon path data are
untouched (verbatim mandate covers logic + SVG, not prose comments).

Files touched:
- core/manipulate/ui/ElementTree.tsx (CREATE)
