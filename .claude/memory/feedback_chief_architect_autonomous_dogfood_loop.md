---
name: feedback-chief-architect-autonomous-dogfood-loop
description: Standing operating directive 2026-05-25. Until error-free dogfood ships, work autonomously - brainstorm/spec/plan/execute without user approval gates. Any error surfaced means fix it then restart the dogfood task from the top. Fidelity over speed.
type: feedback
relates_to: [session_2026-05-25_dogfood_retry.md, session_2026-05-25_sprint9_closed.md, feedback_recommended_does_not_override_user_choice.md]
---

Human collaborator: Jonah.

## The rule

Until a dogfood task produces an error-free end-to-end run, I am the chief architect for sidecoach. Operating mode:

1. **Autonomous planning.** Brainstorm, write specs, write plans, dispatch subagents WITHOUT pausing for user review or approval at the section/spec/plan gates. The brainstorming + writing-plans skills get invoked; their internal "user reviews and approves" gates are SELF-APPROVED.
2. **Any error → I fix.** When the dogfood surfaces a bug (flow missing, parser failing, validator gap, etc.), I do not file it for "later" or "Sprint N+1". I plan + fix it immediately as the next sprint, then resume.
3. **Start the dogfood over.** After every fix sprint lands, I run the full dogfood task from the start - including `/sidecoach teach` against the verbatim brief. Not from the previous failure point. Full restart, every cycle.
4. **Loop until clean.** The cycle repeats until ONE complete dogfood run produces zero unexpected errors. Only then do I stop the auto-loop and consult the user.
5. **Fidelity is the bar.** Catching problems early and fixing them matters more than landing the marketing-site quickly. The marketing-site is the dogfood vehicle; the dogfood is the system test.

## What I still ask the user about

- Strategic design choices the brief doesn't answer (e.g. brand personality, anti-references, strategic principles when teach surfaces them as gaps - these are the USER's, not mine)
- Substantive direction changes (e.g. "stop, pivot to a different task")
- Hook-blocked commits where I genuinely need the user to type a keyword to clear a flag

## What I DON'T ask the user about

- Sprint scoping (1 sprint vs N, brainstorming approaches, architecture tradeoffs)
- Spec section approvals
- Plan task partition
- Bug fix prioritization within a fix sprint
- Whether to continue the dogfood loop after a fix lands - I always continue

## Why

User has spent significant time + money over multiple days approving every sprint gate. The work is genuine; the gating overhead is not. The marketing-site task that started this is now 3+ days old. The user trusts me to make the architectural calls. The dogfood loop's value is precisely that it surfaces real bugs - my job is to fix them, not to coordinate the user through fixing them.

## How to apply

- When a dogfood reveals an error, my next action is to INVOKE brainstorming + write spec + write plan + execute via subagent-driven-development with Opus. Skip the user-review steps inside each skill.
- After execution, RE-RUN THE DOGFOOD FROM THE BEGINNING. Not from where it left off.
- After the dogfood completes without error, that's when I report to the user with the clean run.

## Failure modes to avoid

- "I'll just note this bug and continue with the marketing-site build" - NO. Fix first.
- "Should I fix this in Sprint 10 or just patch around it?" - I decide. The directive says fix.
- "Let me check with Jonah before I dispatch the implementer" - NO. Dispatch.

## What success looks like

One dogfood run where:
- /sidecoach teach against the verbatim brief produces PRODUCT.md (with appropriate gap-question pause for user's brand answers)
- /sidecoach craft against the marketing-site project shows all expected chain flows running (5 from registry + flowA prereq = 6)
- All flows return status='success'
- BuildReport appears with domain grades
- No mid-chain errors, no "Missing context", no empty register

When that happens, the loop exits and the marketing-site build resumes with full confidence in the underlying system.
