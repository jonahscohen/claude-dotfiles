---
name: T-0006 second-fix-gate EXEMPT no-dot source paths
description: Fixed second-fix-gate.sh false positive where hook/skill source edits in this repo (no-dot paths) tripped the verification gate as code fixes
type: project
relates_to: [session_2026-05-28_task-queue-team-deploy.md, session_2026-05-27_second-fix-gate-global-memory-exempt.md]
---

Collaborator: Jonah. Shipped by teammate `t0006-fixgate` (task-queue-0528), integrated by lead.

## Problem
`claude/hooks/second-fix-gate.sh` EXEMPT list matched only the dotted install-target paths `.claude/hooks/` and `.claude/skills/`. The dotfiles repo stores hook/skill SOURCE under the no-dot paths `claude/hooks/` and `claude/skills/`, so editing a hook source file in this repo tripped the fix-gate as if it were a code fix needing verification. False positive.

## Fix
Added the no-dot variants to EXEMPT (line 55):
`EXEMPT = [".claude/memory/", "MEMORY.md", ".claude/hooks/", ".claude/skills/", "claude/hooks/", "claude/skills/"]`
Comment block extended to explain why both dotted and no-dot variants are listed (no-dot already contains dotted as a substring, so one would suffice, but both are explicit and harmless). EXEMPT_REGEX (global-project-memory match) and all other behavior unchanged.

## Verification
10-case python3 membership check mirroring `any(e in file_path for e in EXEMPT)`:
- `claude/hooks/second-fix-gate.sh` -> exempt (the fixed case)
- `claude/skills/sidecoach.md`, `.claude/hooks/bash-guard.sh`, `.claude/memory/MEMORY.md`, `MEMORY.md` -> exempt
- `src/app.ts`, `packages/sidecoach/src/index.ts`, `claude/settings.json` -> still NOT exempt (gate still fires on real code)
`bash -n claude/hooks/second-fix-gate.sh` clean. No test harness exists for this hook (test-*.sh covers other hooks only) - candidate follow-up if regressions appear.

## Files
- claude/hooks/second-fix-gate.sh (EXEMPT list + comment)
