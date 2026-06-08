---
name: Shortcuts are lies - produce TRUTH in good work
description: Jonah's foundational standard for all product work. The goal is never a hacky workaround to make something "work" - it is the cleanest solution in the fewest steps, with the highest consistency and deliverability, meeting EVERY spec. Shortcuts and lies are the same failure mode.
type: feedback
relates_to: [feedback_debugging_trace_first.md, session_2026-06-05_self-analysis-blackbox-not-reading.md]
---

Jonah, 2026-06-05, verbatim intent: "Whenever we build a product, your goal is not to force some hacky workaround to make something work. Your goal is to make it work in the least amount of steps possible, with the cleanest code possible, with the highest level of consistency, deliverability, while meeting every spec. Shortcuts are failure modes. Lying is a failure mode, and I treat shortcuts like lies. You must produce TRUTH in good work."

**Why:** A workaround that "works" is a lie about the quality of the work. It hides debt, drifts from spec, and erodes trust the same way a false claim does. Jonah judges shortcuts and lies identically. The bar is truth: the real, minimal, clean solution - not the fastest thing that produces a green checkmark.

**How to apply (every build):**
- Solve the ROOT, not the symptom. If you find yourself adding a second thing to compensate for the first not working right, stop and fix the first.
- Fewest steps. No derivative shims/wrappers the user has to remember when the original command/API should just do it.
- Cleanest code, consistent with existing patterns in the repo. Match conventions; do not invent parallel mechanisms.
- Meet EVERY spec, not most. Re-read the ask; confirm each item exists in the output.
- Ground first (read code+beats), then build. Black-box guessing is a shortcut around understanding.
- Never report "works" without truthful proof. "It renders" / a 200 / tsc-clean is not the spec being met.

**Where I violated this in the session that produced this beat (so the pattern is named):**
1. justify-go SHIM - bolted a second command on instead of making the original /justify complete. Jonah rejected it; I removed it. The clean answer was always "make the original work."
2. OPERATIVE-IN-ANOTHER-PANE over-engineering - built complexity to work around the fact that MY session lacked the justify MCP, instead of seeing the simple truth (a fresh session just has it). Complexity to dodge a simple reality.
3. BLACK-BOX DIAGNOSIS - screenshotted the running app instead of grepping the source. A shortcut around reading the code; the answer was one grep away.

The truthful path each time was less work, not more: read the code, fix the root, let the one real command do the job.
