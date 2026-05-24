---
name: session-2026-05-24-sprint5-closed
description: Sprint 5 (Phase 6 part 1 intent disambiguation UI) closed. 5 task commits. Tiered disambiguation - silent on recommendation-set tiebreaks, prompt on alphabetical fallback, two-call resolution via metadata.forceFlowId.
type: project
relates_to: [session_2026-05-24_sprint4_closed.md]
---

Human collaborator: Jonah.

## What this sprint landed

5 commits on `main` (since Sprint 4 closed at `efc79b2`):

- T1 `83ba364` - extend SidecoachResult interface with optional `needsDisambiguation: boolean`, `disambiguationPrompt: string`, and `ambiguousCandidates` fields. Pure interface addition.
- T2+T4 code `7266929` - tiered ambiguity handling in orchestrator. Silent path when `tieBreak.reason.startsWith('Used recommendation field')` and matching candidate exists. Prompt path otherwise. `const detection` widened to `let detection: MatchResult | DisambiguationResult` to support reassignment.
- T3 `f790f92` - `metadata.forceFlowId` bypass routes process() directly to the named flow when the caller supplies it. Validates against `getAllKnownFlowIds()` which unions single-flow handler keys + composite preset ids. Invalid ids return `{ success: false, message: 'Unknown flowId: ...' }`.
- T4 test `6f44a59` - dedicated prompt-path test using a non-recommendation tiebreak reason. Verifies the orchestrator returns the prompt shape correctly.
- T5 `698c338` - end-to-end two-call resolution test. Round 1 patches a synthetic DisambiguationResult, asserts the prompt shape. Round 2 picks the first candidate, calls process() again with metadata.forceFlowId, asserts detect was NOT re-invoked (bypass works) AND the chosen flow appears in flowResults.

## Test count

Sprint 1 + 2 + 3 prep + 3 proper + 4 + 5 = **32 distinct test files, all green.** Zero TypeScript errors.

```
sprint1-integration                                       PASS
design-md-parser                                          PASS
icon-source-reference-paths                               PASS
project-drift-detector                                    PASS
taste-validator-observer-race                             PASS
intent-detector-tiebreak                                  PASS
landing-composition-data                                  PASS
flow-handler-landing-composition                          PASS
copywriting-templates                                     PASS
flow-handler-copywriting                                  PASS
flow-composition-craft-landing                            PASS
sprint2-orchestrator-getHandlers                          PASS
sprint2-context-loader-typing                             PASS
sprint2-rolling-citations                                 PASS
sprint2-integration                                       PASS
sprint3-brand-verify-null-register                        PASS
sprint3-orchestrator-enrich-before-canexecute             PASS
sprint3-process-path                                      PASS
sprint3-motion-stack-detection                            PASS
sprint3-motion-stack-idioms                               PASS
sprint3-motion-stack-integration                          PASS
sprint4-build-report-grading                              PASS
sprint4-build-report-aggregator                           PASS
sprint4-build-report-renderer                             PASS
sprint4-build-report-composite                            PASS
sprint4-build-report-single-opt-in                        PASS
sprint4-build-report-memory-input                         PASS
sprint4-build-report-cli                                  PASS
sprint5-disambiguation-prompt-path                        PASS
sprint5-disambiguation-silent-tiebreak                    PASS
sprint5-force-flowid-bypass                               PASS
sprint5-disambiguation-e2e-resolution                     PASS
```

## Behavior contract

- **Round 1 (ambiguity surfaces)**: caller invokes `engine.process(utterance, { projectPath, projectContext })`. If the intent detector returns `isAmbiguous: true` and the tiebreak reason does NOT start with 'Used recommendation field', the orchestrator returns `{ success: false, needsDisambiguation: true, disambiguationPrompt: 'Your request "<utterance>" could match multiple flows. Which best matches your intent?', ambiguousCandidates: [...], detectedFlow: null, flowResults: [] }`.
- **Round 1 (silent tiebreak)**: when the tiebreak reason starts with 'Used recommendation field' and a candidate matches `chosenFlowId`, the orchestrator silently promotes the winner and continues execution. Caller sees the result as if no ambiguity existed.
- **Round 2 (forced resolution)**: caller invokes `engine.process(<any utterance>, { ..., metadata: { forceFlowId: '<chosen id>' } })`. Orchestrator skips intent detection entirely. Invalid id returns success=false.

## Known scope notes

- The silent path's string check `startsWith('Used recommendation field')` is intentional: any other tiebreak reason should prompt. If the intent-detector evolves to emit different recommendation-tiebreak prefixes, this check must be updated in lockstep.
- `getAllKnownFlowIds()` unions single-flow handlers + composite preset ids. A flowId duplicated across both registries is technically possible but does not happen today; `includes()` semantics tolerate it.
- Pre-existing test files outside the Sprint 4 baseline (phase-f-integration, phase-h-block7-flow-validator-integration, phase-i-block3-context-tracking-e2e, validator-integration, phase3-completion, phase-g-block4-performance, phase-h-block1-composition, task8-list-command-taxonomy) remain in their pre-Sprint-5 state - not introduced regressions, not Sprint-5 scope.

## Out of scope (filed for future sprints)

- Phase 6 part 2: checkpoint mechanism for pause/resume of long-running composite flows.
- Memoize / cache the disambiguation prompt rendering if it gets called in tight loops.
- Optional: emit a structured `disambiguationToken` so callers can re-invoke without re-computing forceFlowId on the client.

## Local main state

Local `main` continues to be ahead of `origin/main` (no push during Sprint 5). Push timing remains Jonah's call.

## Next on the misty-jingling-plum roadmap

- Phase 6 part 2: checkpoint mechanism (separate sprint).
- Rolling: continue adopting DESIGN.md citation pattern across remaining handlers.
- Followups carried from earlier sprints: wire flowW/flowX into intent-detector.ts, fix composite slash-command help-text parser inconsistency, consume unstructured-validator output into BuildReport.
