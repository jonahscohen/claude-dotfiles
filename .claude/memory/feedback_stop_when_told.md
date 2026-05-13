---
name: Stop means stop - do not continue breaking things
description: When user says STOP or REVERT, immediately stop all changes and restore the last working state. Do not add more code on top.
type: feedback
---

When the user says STOP, REVERT, or expresses extreme frustration with a change direction, immediately:
1. Stop making changes
2. Revert to the last working commit
3. Ask what they actually want before touching anything

**Why:** Multiple attempts to "fix" the Claude button kept making it worse - wrong background, wrong hover, wrong placement, broken expand. Each iteration drifted further from what the user wanted. The user had to say STOP multiple times.

**How to apply:** If a change is going wrong after 2 attempts, stop and ask for clarification with a specific mockup or reference, rather than guessing and iterating blind.
