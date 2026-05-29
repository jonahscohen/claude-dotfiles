---
name: skill-recon Tier 1 SHIPPED (T-0030/31/32)
description: Forms validator domain + gesture/drag physics + shadcn Tailwind-token taste carve-out built by the tier1-build team, verified by lead, committed
type: project
relates_to: [session_2026-05-28_tier1-build-team.md, session_2026-05-28_skill-recon-synthesis.md]
---

Collaborator: Jonah. Shipped 2026-05-28 by the tier1-build cmux team (validator-domains + taste-carveout), verified + integrated by lead.

## What shipped
- **T-0030 Forms validator domain**: new `forms` domain, 20 rules FORMS_001-020 in extended-domain-validator.ts (autocomplete+name, type/inputmode, never-block-paste, spellcheck-off, submit-stays-enabled+idempotency, inline-errors+focus-first, placeholder example+ellipsis, one-time-code on non-auth, trim-ws, unsaved-changes warn, Enter/Cmd+Enter, checkbox/radio hit-target, label-on-every-control, dont-pre-disable-submit, aria error association, no-placeholder-as-label, autofocus-sparingly). Graceful N/A when no form markup. Flow G (flow-handler-component-implementation.ts) wired to consult it. MCP: optional `html` field added to DomainCheckContext + passed in validate-extended-domain.ts (html already in tool input -> no schema change). Domain/rule counts made DYNAMIC (fixed historical off-by-one "10 domains"). Source extracted to reference/_extracted/external/vercel-web-interface-guidelines/forms-guidelines.md (Vercel Labs 2025, MIT).
- **T-0031 Gesture/drag physics**: 6 rules MOTION_GESTURE_001-006 in the motion domain (setPointerCapture, multi-touch lockout, boundary damping max*(1-exp(-offset/max)), velocity dismissal >0.11 + 20px, momentum continuity, touch-action). reference/_extracted/local-skills/motion-reference/GESTURE-DRAG-PHYSICS.md created - Framer Motion translated to vanilla pointer-events + GSAP, physics constants verbatim (mblode/agent-skills, MIT).
- **T-0032 shadcn/Tailwind carve-out**: taste-validator.ts hardcoded-hex-in-hover + border-radius-drift checks now treat Tailwind/shadcn token-utilities (bg-primary/90, rounded-*=--radius, hsl(var(--token))) as compliant. Gated on a content heuristic (detectTailwindContext) because validateTaste only receives html/css strings (no path); optional componentsJson forward-hook for future filesystem-aware callers. Non-Tailwind path unchanged. New test taste-validator-tailwind-tokens.test.ts (4 cases) green.

## Counts
Extended rules 137 -> 163 (+26: 20 forms + 6 gesture). Domains 11 -> 12 (new forms). Framework total (incl. 22 polish-standard) 159 -> 185.

## Build decomposition (collision-free by file ownership)
Applied the task-queue lesson up front: extended-domain-validator.ts holds ALL domain rules in one array, so T-0030 + T-0031 were assigned to ONE teammate (validator-domains), and the disjoint taste-validator.ts to a second (taste-carveout). They built concurrently in the shared tree with zero collision (worktree isolation is a no-op). cmux team in panes per the orchestration-routing decision.

## Lead verification (not just teammate reports)
- parent `npx tsc --noEmit`: clean except the 4 pre-existing benchmark TS6059 rootDir errors (the known T-0027 wart; none in touched files).
- mcp-server `npx tsc --noEmit`: clean against freshly-built dist (validator-domains' stale-dist `(context as any).html` cast reads cleanly post-build).
- Tests: validator-integration 5/5 (163 rules / 185 combined), phase-f-integration 9/9 (flowG PASS), taste-validator-observer-race PASS, sprint7-taste-validator-result PASS, new taste-validator-tailwind-tokens PASS, mcp-server suite 254/254.
- `npm run build` regenerated dist for all changed modules.

## Notes
- taste-carveout set `~/.claude/.suppress-fix-gate` mid-build (second-fix-gate false-fired on the parallel edit to a file it did not own). Lead cleared it at cleanup.
- The pre-existing benchmark TS6059 wart remains (out of scope; candidate follow-up = give benchmarks their own tsconfig or exclude the bench-ledger test).

## Files
- MOD src/extended-domain-validator.ts, src/flow-handler-component-implementation.ts, src/taste-validator.ts, mcp-server/src/tools/validate-extended-domain.ts
- NEW src/__tests__/taste-validator-tailwind-tokens.test.ts, reference/_extracted/external/vercel-web-interface-guidelines/forms-guidelines.md, reference/_extracted/local-skills/motion-reference/GESTURE-DRAG-PHYSICS.md
- dist rebuilt
