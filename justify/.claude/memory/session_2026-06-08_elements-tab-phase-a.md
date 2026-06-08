---
name: Manipulate Elements tab - Phase A (1:1 navigator) built + validated
description: Retune ElementTree ported 1:1 into Manipulate mode via the cmux team flow; navigator done + code-validated, drag (Phase B) + bulk/undo (Phase C) pending
type: project
relates_to: [session_2026-06-06_retune-build-progress.md, session_2026-06-07_manipulate-revert-and-sections.md]
---

Built the Elements tab (Retune's ElementTree) 1:1 into Justify Manipulate mode using the cmux Claude-teams flow (team `manipulate-elements-tab`: planner -> builder-tree + builder-css (parallel) -> builder-wire -> validator). Jonah's mandate: 1:1 icons/functionality/presentation, no exceptions.

**KEY DE-RISK (planner):** every Elements-tab icon is an inline <svg> literal INSIDE ElementTree.tsx (NO ui/icons.tsx, NO paid @central-icons-react, NO Lucide substitution) - the port carries them verbatim. `getDirectReactComponent` already exists in our core/selector/identifier.ts (~650). Tree CSS tokens already in panel-shell.css. So: near-mechanical React->Preact port of one 923-line file + one CSS block + wiring.

**PHASE A = the 1:1 NAVIGATOR - DONE + validator PASS + installed live.** Files:
- CREATE core/manipulate/ui/ElementTree.tsx (React->Preact verbatim; props Phase A = selectedElement/onSelect/onHover; Phase B props onTreeReorder/onTreeReparent/visualOrderMap/reparentEntries left undefined -> drag dormant, pointerdown falls through to click-select, no dead UI). Exports getVisibleChildren/computeDropIndex/ReparentEntry for the (pending) unit test.
- CREATE core/manipulate/styles/elements-tree.css (verbatim Retune overlay.css 665-817; tokens already exist, zero remap).
- MODIFY PropertyPanel.tsx (Elements stub -> <ElementTree>; branch is OUTSIDE the selector-keyed remount div so expandedSet persists across page clicks).
- MODIFY index.ts (import+register elementsTreeCss LAST in installPanelChrome sheets; renderPanel passes onElementSelect->picker.setSelected(el) [single call: drives on-page chrome AND the same onSelect->selectElement path a page-click uses, no double-rebuild], onElementHover->picker.highlight(el)/null-clear).
- Mandated fixes applied + validated: R2 Preact e.nativeEvent (Retune line 417), R3 isRetuneElement->isJustifyOverlayElement (excludes data-justify / data-justify-* / [data-justify-host] = panel host + all picker chrome), R8 data-retune-tree-key->data-justify-tree-key.
- VALIDATOR PASS: byte-for-byte icons (10 paths + 4 rects identical), logic 1:1 (only documented deviations), CSS verbatim, wiring correct, build green, served core 26x retune-tree. Live visual/functional check is JONAH's (agents can't activate Justify in the headless session).

**PENDING:** Phase B = wire drag-reorder/reparent into preview/changeBuffer/syncQueue as reorder/reparent pseudo-prop tasks (+ port __tests__/tree-drag.test.ts) - separate validation. Phase C = bulk-scope propagation + undo stack (Retune's ChangeTracker/FLIP) - heaviest; decide full-parity vs lean with Jonah when there. R7: tree labels kept JustifySans (1:1 Retune); flip class/id tokens to JustifyMono only if Jonah wants house-style.

**SEPARATE TICKETS surfaced by validator (NOT tree bugs):**
- N2 (pre-existing): picker.ts:1109 READS `data-justify-aspect-locked` but SizeSection.tsx:266/268 WRITES `data-retune-aspect-locked` -> aspect-lock-on-resize never triggers. Fix the name mismatch.
- N1 (latent): isJustifyOverlayElement uses a data-justify-* prefix match; safe today (no real page element carries it) but a functional data-justify-* attr on a real element would hide it from the tree.

**RUNTIME BUG the validation MISSED (Jonah: "I can't select anything"):** clicking a tree row did nothing. ROOT CAUSE: ElementTree has NO row onClick->onSelect; selection lives INSIDE the drag handler's pointer-up (onSelect(drag.element) on a no-movement press = a click). builder-tree's "drag dormant -> pointerdown falls through to click-select" was WRONG: handleDragStart early-returns at the top when onTreeReorder/onTreeReparent are undefined (line 878), which skips the very pointer-up setup that does click-select. So Phase A killed BOTH drag AND selection. FIX (in handleDragStart, the no-drag branch): instead of bare `return`, add a one-shot capture pointer-up that calls onSelect(element) if the press didn't move (<4px) - keeps click-select in Retune's same handler; Phase B's real drag path owns click-select so this branch is skipped. Added onSelect to the useCallback deps (923). Built+installed.

**LESSON (validation gap):** the validator gave code-level PASS because the prop chain LOOKED wired (onSelect -> picker.setSelected), but the TRIGGER (the row's selection event) was never fired at runtime. The headless team agents CANNOT activate Justify in-browser, so they can't catch "clicking does nothing." => For functional 1:1, code-diff validation is necessary but NOT sufficient; the LIVE-FUNCTIONAL check (does the core interaction actually work) is the real gate and it is JONAH'S (the only one who can drive the live browser). Going forward: frame the user's live test of the CORE interaction as the primary validation, not a bonus, and name the specific interaction to test (here: "click a tree row -> does it select?") before claiming success.

Collaborator: Jonah. Team kept alive (idle) for Phase B. Build/serve: node build.js -> cp dist/justify-core.js ~/.claude/justify/dist/; daemon no-store; reload to pull.
