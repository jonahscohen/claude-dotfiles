---
name: session-2026-05-25-sprint10-design
description: Sprint 10 (chain context propagation - 3 root-cause bugs explaining flowH/I missing from craft chain) design + plan. Executed autonomously per chief-architect directive.
type: project
relates_to: [feedback_chief_architect_autonomous_dogfood_loop.md, session_2026-05-25_sprint9_closed.md]
---

Human collaborator: Jonah.

## Trigger

Sprint 9 closed; dogfood verified its 3 fixes work but surfaced a new bug: flowH (motion-integration) and flowI (accessibility) silently absent from the craft chain output. Per the chief-architect directive (`feedback_chief_architect_autonomous_dogfood_loop.md`), I'm executing Sprint 10 autonomously - no user gates.

## Root-cause investigation

Read `sidecoach-orchestrator.ts:909-1015` (chain executor) and the canExecute methods of flowH/I handlers. Three compounding bugs:

1. **Chain executor drops projectContext.** The executionContext built at line 909 copies utterance/userId/projectPath/currentFile/selectedText/metadata - but NOT projectContext. flowI's canExecute reads `context.projectContext?.register` and finds undefined.
2. **canExecute=false silently drops the flow.** Line 957 `if (handler.canExecute(enrichedCtx)) { ... }` has no else branch. Sprint 9 T3 wrapped the body in try/catch but didn't add the else for canExecute. Flows whose prerequisites fail just disappear from results.
3. **Parser/consumer casing mismatch.** Sprint 9 T1's parser writes `brandpersonality` (lowercased no separator). flowH's canExecute reads `brandPersonality` (camelCase) or `brand_personality` (snake_case). Neither matches.

## Sprint 10 spec

`docs/superpowers/specs/2026-05-25-sidecoach-sprint10-chain-context-propagation.md`.

Three surgical fixes, three new tests. Re-dogfood verification at the end.

## Plan size

4 tasks: T1 propagate projectContext, T2 push skipped result on canExecute=false, T3 parser camelCase keys, T4 re-dogfood + close.

All implementer dispatches use `model: "opus"`.

## Mode

Skipping skill-driven brainstorming gates per chief-architect directive. Spec written directly. Plan written directly after this memory. Execute via subagent-driven-development with Opus. Commit + push. Re-dogfood.

If re-dogfood surfaces ANY new error, fix in Sprint 11 and restart the dogfood. Loop until clean.

## Plan written

`docs/superpowers/plans/2026-05-25-sprint10-chain-context-propagation.md`. 4 tasks (T1 projectContext propagation, T2 canExecute=false records skip, T3 parser camelCase keys, T4 re-dogfood + close). About to commit spec + plan then dispatch T1 implementer.
