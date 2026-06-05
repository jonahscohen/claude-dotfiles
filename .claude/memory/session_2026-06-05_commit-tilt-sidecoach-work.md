---
name: Commit sweep - tilt-lab embed + sidecoach intent tier + ClickUp hook versioned
description: Jonah (2026-06-05) said "commit everything." Branched feat/tilt-lab-embed-sidecoach-intent off main and split the uncommitted work into 3 logical commits. Surfaced + fixed an integrity issue first: settings.json (pre-existing change) wired a PreToolUse hook to ~/.claude/hooks/block-clickup-writes.sh which existed ONLY in ~/.claude/hooks, not the repo - copied it into claude/hooks/ so a fresh clone resolves it.
type: project
relates_to: [session_2026-06-05_sidecoach-intent-tier-and-tilt-dependency.md, session_2026-06-04_tilt-lab-embed-export.md]
---

Collaborator: Jonah. 2026-06-05.

## Action
"Commit everything." On main (default) so branched first per workflow: feat/tilt-lab-embed-sidecoach-intent.

## Integrity fix before committing
settings.json had an uncommitted (not-mine) change wiring a PreToolUse matcher mcp__claude_ai_ClickUp__clickup_ -> ~/.claude/hooks/block-clickup-writes.sh. That script was a REAL file in ~/.claude/hooks (not a symlink, not in the repo), so committing settings.json alone would leave the repo referencing an unversioned hook (broken on a fresh clone). Read it (legit user-policy guard: deny all ClickUp create/update/delete/add/remove/move/send/attach/time-tracking; allow read-only get/list/search/filter/find/resolve). Copied it into claude/hooks/block-clickup-writes.sh (chmod +x) so the wiring resolves in-repo.

## Commit plan (3 logical commits)
- A feat(tilt-lab): portable embed export + open-tiltlab skill (tilt-lab/* + claude/skills/tilt-lab/ + 06-03 PLAN beat + 06-04 embed beat).
- B feat(sidecoach): intent-tier triggering + cooldown + tilt-lab dependency (sidecoach-keyword.sh, sidecoach-intent.json, test-sidecoach-keyword.sh, CLAUDE.md, sidecoach SKILL.md, 06-05 intent beat, MEMORY.md).
- C chore(policy): version the ClickUp write-block hook + task-list skill (block-clickup-writes.sh, settings.json, task-list SKILL.md).

## Notes
- No AI attribution in commit messages (CLAUDE.md rule + content-guard); plain messages, git author = Jonah.
- dist/ is gitignored, so the rebuilt tilt-runtime.js is not committed - consumers run npm run build (documented in the tilt-lab skill).
- The bash-guard blocked the first commit attempt for dirty beats (the cp wrote a file with no beat) - this beat clears it.

## Files
- claude/hooks/block-clickup-writes.sh (new in repo, copied from ~/.claude/hooks)
