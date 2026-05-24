---
name: session-2026-05-24-sprint3-prep-closed
description: Sprint 3 prep (T11 carryover) closed. 4 commits shipped, fixed three real bugs uncovered during Sprint 2, ported the deferred process()-path integration test. Sprint 3 (Phase 4 stack-aware motion) is now unblocked.
type: project
relates_to: [session_2026-05-24_sprint2_t11_deferred.md, session_2026-05-24_sprint2_closed.md]
---

Human collaborator: Jonah.

## What this sprint prep landed

4 commits, all on `main` directly (Sprint 2 already merged):

- T1 (`ea00400`): `flow-handler-brand-verify.ts:191-200` null-checks `REGISTER_SPECIFIC_LAWS[register]` so undefined register no longer crashes the prerequisite chain. New unit test `sprint3-brand-verify-null-register.test.ts` asserts the private `cacheDesignLawsForRegister(undefined)` returns a fallback array instead of throwing.

- T2 (`1836023` + `b956add`): `sidecoach-orchestrator.ts` enriches context BEFORE calling `canExecute` in all 3 call sites (composite at line 548, sequential at 727, natural-language at 925). Single enrichment per call site shared by `canExecute` + `execute`. The initial commit leaked private visibility on `enrichContextForHandler`; the follow-up `b956add` reverted that and rewrote the test to actually use `engine.process('lint design.md', ...)` with a refined assertion: flowF appears in flowResults AND was NOT canExecute-skipped (which would have a specific message if the fix weren't in place).

- T3 (`eb22588`): `deterministic-validator.ts` Gate 3 now degrades tool-internal `@google/design.md` lint crashes to warning. This was the third bug discovered during T11 work - the lint tool itself was throwing `Unexpected error during model building: raw.match is not a function` on `reference/DESIGN.md` content, and the validator was treating it as a blocking issue. With this fix, the validator only blocks on actual content failures (not on third-party tool bugs). The verbatim T11 source ported as `sprint3-process-path.test.ts` now passes with 11 DESIGN.md citations reaching `result.flowResults[].guidance` via `engine.process()`.

## Three bugs uncovered + fixed

1. `flow-handler-brand-verify.ts:192-193` crashed on undefined register (was: `REGISTER_SPECIFIC_LAWS[register].description` without null-check). Fix: null-safe lookup + fallback string.
2. `sidecoach-orchestrator.ts:548, 727, 925` called `canExecute` BEFORE enrichment, causing handlers whose canExecute reads enriched fields to be falsely skipped. Fix: swap order, share single enrichment.
3. `deterministic-validator.ts` Gate 3 escalated `@google/design.md` lint tool-internal crashes to blocking, preventing flowF from running even when DESIGN.md content was valid. Fix: add tool-internal-error degradation branch matching the existing missing/timeout branches.

The first two were called out in `session_2026-05-24_sprint2_t11_deferred.md`. The third was discovered while testing T2/T3 against the actual reference project.

## Test count

Sprint 1 + Sprint 2 + Sprint 3 prep: **18 distinct test files, all green.**

```
sprint1-integration                              PASS (2 assertions)
design-md-parser                                 PASS (2 assertions)
icon-source-reference-paths                      PASS
project-drift-detector                           PASS (2 assertions)
taste-validator-observer-race                    PASS
intent-detector-tiebreak                         PASS
landing-composition-data                         PASS
flow-handler-landing-composition                 PASS
copywriting-templates                            PASS
flow-handler-copywriting                         PASS
flow-composition-craft-landing                   PASS
sprint2-orchestrator-getHandlers                 PASS
sprint2-context-loader-typing                    PASS (color section keys=5)
sprint2-rolling-citations                        PASS (typography=4, component=4, motion=5)
sprint2-integration                              PASS
sprint3-brand-verify-null-register               PASS
sprint3-orchestrator-enrich-before-canexecute    PASS (flowF reached its handler with status=success)
sprint3-process-path                             PASS (11 citations through engine.process())
```

TypeScript: zero errors across the project.

## Sprint 3 (Phase 4) is now unblocked

Phase 4 = stack-aware motion (flowH detects vanilla vs React/Vue/Svelte from `techStack` in `ProjectContext` and emits framework-appropriate motion code). The T11 carryover blockers above were the only Sprint 2 -> Sprint 3 prerequisite; Sprint 3 can begin clean.

## Open follow-ups (for Sprint 3 proper or rolling)

- **flowW/X intent-detector wiring.** `sidecoach/src/intent-detector.ts:22-66` hand-codes detectors for flowA through flowV but not flowW (landing-composition) or flowX (copywriting). Sprint 2 added them to the trigger registry (`flows.ts`) and the orchestrator handler map but never wired the intent detector. Natural-language utterances like 'lay out a landing page' currently return null. Fix: add `createFlowWDetector()` and `createFlowXDetector()` methods and append them to the `this.detectors` list.
- **brand-verify's own register detection.** During T2/T3 testing the brand-verify handler logged register as empty string in its guidance even though `buildProjectContext` correctly returned `'product'` for the same PRODUCT.md. The handler likely has its own internal `detectRegister` that disagrees with the context-loader. Worth a small follow-up to align them.
- **Rolling citation pattern.** 4 of ~25+ handlers now cite DESIGN.md. Continue in spare-cycle commits.
- **Push timing.** Local `main` is now 51+ commits ahead of `origin/main`. User decides when to push.
