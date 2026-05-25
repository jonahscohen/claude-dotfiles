---
name: session-2026-05-25-sprint12-design
description: Sprint 12 design - craft chain declares research prereqs (flowB + flowE) so it stops relying on stale persistent history to pass.
type: project
relates_to: [session_2026-05-25_sprint11_closed.md, feedback_chief_architect_autonomous_dogfood_loop.md]
---

Human collaborator: Jonah. Executed autonomously per chief-architect directive.

## Trigger

Sprint 11 dogfood: flowH errored "Required flow flowE_motion_patterns has not been executed".

## Investigation

flow-prerequisites.ts declares:
- flowG_component_implementation requires flowB_component_research (required: true)
- flowH_motion_integration requires flowE_motion_patterns (required: true)

Sprint 11 craft chain = [A, F, G, H, I, J] - neither B nor E is in it.

flowG was passing only because flow-history.ts persists to `~/.claude/sidecoach-flow-history.json` and a prior sprint's dogfood happened to record flowB. Stale state masking the gap. flowE was never recorded so flowH failed cleanly.

## Fix

Add flowB and flowE to craft chain in natural order:

```
A (shape) -> B (research) -> E (research) -> F (tokens) -> G (impl) -> H (motion) -> I (a11y) -> J (polish)
```

Chain length becomes 8.

## Also fix dogfood cleanliness

Clear `~/.claude/sidecoach-flow-history.json` before each dogfood run so latent prereq gaps surface rather than getting masked.

## Spec

`docs/superpowers/specs/2026-05-25-sidecoach-sprint12-craft-research-prereqs-design.md`

## Plan

`docs/superpowers/plans/2026-05-25-sprint12-craft-research-prereqs.md` - 3 tasks: T1 registry expand to 8 + test update, T2 dogfood history reset, T3 re-dogfood + close. Inline execution (small enough), no subagent dispatch.
