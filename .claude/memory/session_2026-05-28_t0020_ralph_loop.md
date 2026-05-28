---
name: T-0020 ralph-mode relentless cross-flow iteration
description: Cross-flow loop that drives polish/audit/critique to convergence, stall, or cap; sixth sidecoach mode wired
type: project
relates_to: [session_2026-05-28_t0009_retry_control.md, session_2026-05-28_t0011_modes.md, session_2026-05-28_omc-research-synthesis.md]
---

# T-0020: ralph-mode relentless iteration

Closes OMC gap #2 from the 2026-05-28 OMC research synthesis. OMC's "Ralph" mode pushes work to convergence by re-running validators until they stop complaining; sidecoach now has the same shape, design-coded.

## What shipped

New module `sidecoach/src/ralph-loop.ts` exports:

- `runRalphLoop(target, opts): Promise<RalphResult>` - the main entry point
- `computeProgressSignature(findings)` - sha256-12 hash over sorted finding identities, used to detect stall
- `extractFindingsFromFlowResult(flowId, result)` - convenience for runners that map a `FlowExecutionResult` into `RalphFinding[]`
- Default constants `DEFAULT_RALPH_FLOW_CHAIN`, `DEFAULT_RALPH_MAX_GLOBAL_ITERATIONS=10`, `DEFAULT_RALPH_MAX_NO_PROGRESS_ITERATIONS=3`

Why: T-0009's retry-control caps PER-HANDLER iteration (polish handler retries polish 5 times). T-0020 chains ACROSS handlers (polish -> audit -> critique -> polish -> audit -> ...) until either (a) every flow reports zero findings (converged), (b) the same finding-signature repeats for the last N iterations (stalled), or (c) maxGlobalIterations is reached (capped).

How: each iteration walks the flow chain in order, invokes the caller-supplied `runFlow` injection per flow, collects `RalphFinding[]`, computes a progress signature, and routes to one of the four exits (converged / stalled / capped / error). The loop emits log lines verbatim matching the team-lead spec:

```
[ralph] iter 1/10: flowJ_tactical_polish found 2 violations
[ralph] iter 1/10: flowK_multi_lens_audit found 1 violations
[ralph] iter 1/10: flowL_design_critique found 0 violations
[ralph] iter 2/10: flowJ_tactical_polish found 2 violations
[ralph] iter 2/10: flowK_multi_lens_audit found 1 violations
[ralph] iter 2/10: flowL_design_critique found 0 violations
[ralph] iter 3/10: flowJ_tactical_polish found 2 violations
[ralph] iter 3/10: flowK_multi_lens_audit found 1 violations
[ralph] iter 3/10: flowL_design_critique found 0 violations
[ralph] STALLED at iter 3 (same signature 9e2f8c1d4b07 for 3 iter)
```

When validators come clean the same loop emits `[ralph] CONVERGED in N iter`. When the global cap fires it emits `[ralph] CAPPED at maxIter (N)`.

## Auto-fix gap (the honest part)

Today's sidecoach handlers REPORT findings but they do not have a fix-mode that applies changes. Without an applyFixes step, each iteration produces the same findings, the progress signature matches, and the loop halts at maxNoProgressIterations (default 3). That is correct behavior - the loop is still useful as a diagnostic that surfaces what would block convergence.

Forward-compat: `RalphOptions.applyFixes` is wired. When handlers grow a fix-mode (or an LLM-driven fix step is wired between iterations), pass it via opts and the loop will call it after collecting findings and before the next iteration. Signatures will then evolve as fixes land, the stall check stops firing, and convergence becomes reachable. This mirrors T-0016's forward-compat ledger pattern (synthetic today, live when handlers wire trackCost).

The module header documents this gap so future maintainers do not chase the "why isn't it converging" mystery.

## Mode registration

Added `ralph` as the 6th sidecoach mode:

- `sidecoach/src/modes.ts` - RALPH entry with verbChain `['polish', 'audit', 'critique']` and FlowId chain `[flowJ_tactical_polish, flowK_multi_lens_audit, flowL_design_critique]`
- `claude/hooks/sidecoach-modes.json` - mirrors the registry for the bash keyword hook

Name rationale: `ralph` is the recognizable industry term carried forward from OMC verbatim. Sidecoach earns its design vocabulary by what the loop ACTUALLY drives (design validators, not generic code checks); reusing the name means anyone coming from OMC finds it where they expect.

## Test results

- `sidecoach/src/__tests__/t20-ralph-loop.test.ts`: 43/43 PASS covering all five spec scenarios plus guard checks (convergence, stalled, capped, progress-signature uniqueness, empty-chain error, missing-runner error, log-format verbatim, runner-throw isolation, chain ordering, applyFixes wiring, signature stability across permutations, default constants)
- `claude/hooks/test-sidecoach-keyword.sh`: 90/90 PASS (was 87) - added 3 ralph cases: mode fires with verbChain emit, informational `what is ralph` suppression, word-boundary check that `ralphing` does NOT fire
- Regression: t9-retry-control 52/52, t12-model-routing 54/54, t13-bench-harness 46/46 all still green
- `npx tsc --noEmit`: zero new errors (only the four pre-existing T-0013/T-0016 benchmark rootDir warnings)

## Documentation

Updated all three mode-listing surfaces from 5 -> 6 modes:

- `claude/skills/sidecoach/SKILL.md` - Modes section table + framing line
- `claude/skills/sidecoach/CHEATSHEET.md` - Section 0 - Modes (6 commands), table row added
- `marketing-site/cheatsheet.html` - "Modes - 6 shape-of-work keywords" title + table row added

## Files touched

- `sidecoach/src/ralph-loop.ts` (new)
- `sidecoach/src/modes.ts` (added RALPH)
- `sidecoach/src/__tests__/t20-ralph-loop.test.ts` (new)
- `claude/hooks/sidecoach-modes.json` (added ralph)
- `claude/hooks/test-sidecoach-keyword.sh` (added 3 ralph tests)
- `claude/skills/sidecoach/SKILL.md` (5 -> 6 modes)
- `claude/skills/sidecoach/CHEATSHEET.md` (Section 0 count + table row)
- `marketing-site/cheatsheet.html` (title + table row)
- `TASKS.md` (T-0020 active -> done)
