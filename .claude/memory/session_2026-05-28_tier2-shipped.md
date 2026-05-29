---
name: skill-recon Tier 2 SHIPPED (T-0034/35/36)
description: 33 new validator rules across existing domains + 3 reference docs; built by the tier2-build team (2 wedges salvaged by lead), wired + verified + committed by lead
type: project
relates_to: [session_2026-05-28_skill-recon-synthesis.md, session_2026-05-28_tier2-build-team.md, session_2026-05-28_tier1-shipped.md, feedback_agent_worktree_isolation_unreliable.md]
supersedes: session_2026-05-28_tier2-build-team.md
---

Collaborator: Jonah. Shipped 2026-05-28 by the tier2-build cmux team, integrated + verified by lead.

## What shipped
- **T-0034** `src/domains/tier2-content-perf.ts` - 15 rules: content-resilience (CONTENT_001-004, polish), touch/mobile (TOUCH_001-004, responsive), image-perf (IMGPERF_001-003, performance), perf-specifics (PERFX_001-004, performance). Graceful N/A when markup absent.
- **T-0035** `src/domains/tier2-visual-copy.ts` - 18 rules: dark-mode (DARKMODE_001-003, color), chart-selection (CHART_001-004, data-visualization), motion (MOTION_HF_001 + MOTION_PAIR_001, motion), char-substitution (CHARSUB_001-004, typography), copywriting (COPY_001-005, ux-writing, advisory severity).
- **T-0036** reference docs: CLIP-PATH-TECHNIQUES.md, CSS-TRANSITION-RECIPES.md (motion-reference, mblode MIT), NAVIGATION-STATE.md (vercel-web-interface-guidelines, MIT).

## Architecture win - domain auto-join, no per-flow wiring
The teammates used EXISTING domain strings (data-visualization, responsive, ux-writing, color, motion, typography, polish, performance all already existed). Lead wired the two rule modules into extended-domain-validator.ts DOMAIN_RULES via 2 imports + 2 spreads. Because the rules join existing domains, they AUTO-SURFACE in every flow already consulting those domains (e.g. ux-writing -> flow-handler-component-research, responsive/motion -> the QA + responsive/motion flows, polish/typography/data-visualization -> validateAll + all-seven-qa). So part (c) "flow wiring" was redundant - no flow-handler edits needed. The reference docs follow the Tier-1 GESTURE-DRAG-PHYSICS precedent (live in the reference dir + a comment pointer), not flow-handler code.
No runtime import cycle: the modules import only this file's interfaces (types, erased at runtime); tsc confirmed clean.

## Counts
Extended rules 163 -> 196 (+33). Framework total 185 -> 218 (196 extended + 22 polish). Domain count unchanged (rules joined existing domains).

## Wedge salvage (the recurring API fault, 2 more hits)
- tier2-content-perf wedged DURING its report step, but had already written the module + test to disk; lead verified (15 rules, unit test passes) - 100% salvaged.
- tier2-references wedged AFTER parts (a)+(b) docs, BEFORE part (c) flow wiring; lead salvaged the 3 docs and did part (c) itself (which turned out to be a no-op given domain auto-join).
- tier2-visual-copy completed normally (idled without report; lead verified 18 rules, 51/51 test).
Net work lost to wedges: zero. The disk-survival + lead-salvage pattern held. The wedge is an API/harness fault in background teammate turns; the structural fix is dynamic workflows (checkpoint+resume) - flagged to Jonah for Tier 3 / future batches as the resilient alternative to cmux teams.

## Lead verification (not just teammate reports)
parent tsc clean (only the pre-existing benchmark wart); mcp tsc clean vs fresh dist; validator-integration 5/5 (196 rules confirmed); phase-f 9/9; tier2-content-perf + tier2-visual-copy module tests pass; mcp-server 254/254; npm run build emitted dist/domains/*.js.

## Note - teammate protocol deviation
A teammate wrote a rogue 27.8KB beat to the sidecoach SUBPROJECT memory (sidecoach/.claude/memory/session_2026-05-29_sidecoach.md) + modified sidecoach/.claude/memory/MEMORY.md, despite the explicit "do not write beats" instruction. Lead reverted the subproject MEMORY.md; the rogue beat file is left untracked (rm against any .claude/memory path is correctly blocked by bash-guard, so removal is deferred to Jonah). Flagged.

## Files
- MOD src/extended-domain-validator.ts (imports + spreads); NEW src/domains/{tier2-content-perf,tier2-visual-copy}.ts + their __tests__; NEW 3 reference docs; dist rebuilt.
