---
name: Retune Manipulate 1:1 port - kickoff, requirements, source-of-truth
description: Resuming the Manipulate panel as an EXACT 1:1 clone of Retune; real source found; requirements locked; analysis team launched
type: decision
relates_to: [session_2026-05-13_property-panel-port.md]
---

Resuming the long-struggled Manipulate feature: recreate Retune.dev's element Design panel 1:1 inside Justify. Collaborator: Jonah.

**Key unlock:** prior attempts (see [[session_2026-05-13_property-panel-port.md]]) reverse-engineered from Retune's MINIFIED dist (the `Le` class) - that is why it was so painful. The REAL, unminified source is available at `/Users/spare3/Documents/Github/retune/packages/overlay/src/` - a clean React/TSX monorepo, fully decomposed: every Design section is its own component (`ui/sections/*Section.tsx`), every control isolated (`ui/number-input`, `slider-input`, `segmented-control`, `alignment-grid`, `color-picker`, `gradient-editor`, ...), icons in `ui/icons.tsx`, value read/preview/output in `inspector/` + `engine/`. Port from the REAL source now, not the dist.

**Requirements (locked with Jonah):**
1. Panel = 1:1 EXACT Retune clone (presentation + function). Send/apply/review stays on Justify's existing rails (Claudebar -> prompt -> /respond -> Changes panel).
2. Start fresh if cleaner, but EXACT means EXACT - use THEIR assets (icons, sizing, everything verbatim).
3. Design-panel parity FIRST; the Elements tree is merely the entry vector to the Design tab (deferred).
4. Send-to-Claude = ONE task per element edited.
5. Verification source of truth (Claude's call): real source = canonical exact values; local playground (`retune/playground`, Next.js on localhost:3002 via `npm run dev`) = visual/behavioral 1:1 bench; retune.dev (live, HTTP 307) = secondary cross-check.

**Flow:** enter Manipulate -> select element (direct DOM click OR Elements tab) -> (Design tab if via tree) -> manipulate with LIVE DOM preview -> first change shows in Claudebar bottom-left (like Prompt mode) -> send one-task-per-element -> hot refresh -> Changes panel review.

**Pivotal architecture decision (deferred to analysis + Jonah sign-off):** Retune panel is React/TSX; Justify core is vanilla TS (esbuild IIFE). Either bundle a tiny React-compatible runtime (Preact ~4KB) and port components near-verbatim, OR hand-rewrite as imperative vanilla DOM (what the old 98KB property-panel.ts attempted and struggled with). Lean: Preact-port for EXACT fidelity + maintainability; analysis team to recommend with evidence.

**Orchestration (Claude = manager):** Phase 1 Analyze/Spec. NOTE: first attempt wrongly used the Workflow tool (silent in-process agents) - forbidden in cmux-teams mode; killed and redone via the proper team flow (see [[feedback_cmux_teams_use_team_flow_not_workflow.md]]). The bypassed-run output was archived to `justify/docs/retune-port-bypassed-run/`. Re-run uses team `retune-spec`: shared 12-task list (11 area specs + synthesis blocked on them), 5 named Agent teammates as visible cmux splits (shell-analyst, sections-analyst, controls-analyst, assets-analyst, entry-analyst) writing to `justify/docs/retune-port/`; synthesizer spawned after the 11 land to write `00-PLAN.md`. Phase 2 = bring spec + render-architecture recommendation to Jonah for sign-off. Phase 3 = build Design parity smallest-first. Phase 4 = verify side-by-side at :3002.

Files touched: docs/retune-port/ (spec output dir created)
