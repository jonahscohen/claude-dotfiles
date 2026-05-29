---
name: tilt-lab foundation implementation plan
description: Wrote the Plan-1 (foundation) implementation plan for tilt-lab - 9 bite-sized TDD tasks delivering the runtime contract, manifest validation, layering rules, generic web-component wrapper, compositor, reference gradient effect, and esbuild bundle. Resequenced so the contract precedes team acquisition.
type: project
relates_to: [session_2026-05-29_tilt-lab-brainstorm.md]
---

Collaborator: Jonah. 2026-05-29. Via superpowers:writing-plans. Plan saved + committed.

## Key resequencing decision
Spec listed Acquisition as Phase 1, but the plan INVERTS this: the runtime contract (Effect interface + manifest schema + web-component wrapper + compositor) MUST exist and be tested before acquisition fans out, else 9 parallel agents each invent an incompatible contract. So Plan 1 = foundation (critical path). Acquisition/UI/server become Plans 2-4. tilt-lab is a SEQUENCE of plans, not one monster plan - and 25 external-source acquisitions can't be pre-written as code (agents fetch source at runtime), which is exactly why acquisition is a team fan-out, not a code-complete plan.

## Repo conventions confirmed (grounding the plan's commands)
- Vitest is the established test runner (justify uses `npx vitest run`). tilt-lab uses Vitest + happy-dom.
- esbuild for bundles (justify/build.js pattern: esbuild, format, globalName, minify). tilt-lab/build.js mirrors it -> dist/tilt-runtime.js (ESM).
- Vite + React for the app shell (decided in brainstorm); runtime layer is framework-free.
- top-level shaders/ is ghostty terminal shaders (bettercrt/cursor_blaze/tft) - NOT related; tilt-lab gets its own top-level dir.

## The 9 foundation tasks
1 scaffold (package.json/tsconfig/vitest.config/.gitignore) 2 types.ts (Effect/Manifest/LayerRole/ParamSpec/LayerConfig/EffectOpts) 3 manifest.ts validateManifest (TDD) 4 stack.ts validateStack+orderLayers (pure, fully TDD - the 4-role rules: bg max1, post max1, mid/pointer stackable, order bg->mid->pointer->post) 5 element.ts defineEffectElement generic wrapper (happy-dom + fake effect; owns canvas/RAF/ResizeObserver/reduced-motion/dispose; attrs->setParam) 6 compositor.ts Compositor + tilt-stack element (post layer samples shared composite canvas; orchestration tested with RecordingEffect fakes; pixels verified via cmux later) 7 effects/gradient reference effect (Canvas2D so unit-testable; the template acquisition agents copy) 8 index.ts barrel + registerBuiltins + effectFactories registry 9 build.js esbuild bundle + node/happy-dom smoke that elements register.

## Honest risk callouts baked into the plan
happy-dom RAF/Canvas2D may be stubs - Tasks 5 + 7 give concrete fallbacks (guard frame on createLinearGradient; tests assert no-throw so stubs pass).

## Next
Offer execution choice (subagent-driven vs inline). Foundation is contract-defining/shared-state => NOT parallelizable; build it solo or one focused agent. The TEAM fan-out belongs to Plan 2 (acquisition) AFTER the contract lands. Possible concurrent win: a recon team that just fetches raw source from the 9 lanes while the foundation is built.

## Files
- docs/superpowers/plans/2026-05-29-tilt-lab-foundation.md (new)
