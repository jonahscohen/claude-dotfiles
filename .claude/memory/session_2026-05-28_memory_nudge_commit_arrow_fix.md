---
name: memory-nudge dirty-flag arrow false-positive fixed
description: git commit messages containing "->" spuriously set .memory-dirty (redirect-token substring match); fixed by exempting pure-git commands; regression test added
type: project
relates_to: [feedback_agent_worktree_isolation_unreliable.md, session_2026-05-05_memory-nudge-hook.md]
---

Collaborator: Jonah. Found + fixed 2026-05-28 while integrating the task-queue-0528 team commits.

## Symptom
`bash-guard.sh`'s commit gate ("BLOCKED: beats are dirty") fired on a `git commit` even though the session beat WAS written. It re-fired right after a successful commit, blocking the next one. Hit it twice during the T-0014 and T-0026 memory commits.

## Root cause (reproduced empirically, not theorized)
`memory-nudge.sh` (PostToolUse Bash branch) classifies a command as a file-write via a `writes` token list that includes the shell-redirect tokens `"> "` and `">>"`. Those substrings ALSO match the arrow `"-> "` (and `">>"` sequences) inside `git commit -m "..."` messages. So a commit whose message contained an arrow - e.g. `-m "rejects in-flight -> TIMEOUT"` - was misclassified as a project write and SET `~/.claude/.memory-dirty` right after the commit consumed the beat. The next commit was then blocked.

Confirmed by running the hook against crafted fixtures: commit-with-arrow -> DIRTY (bug); plain commit -> clean; this is why it was intermittent (only commits with `>` in the message tripped it).

## Self-analysis (correction of my earlier report)
I had told Jonah there were TWO bugs: (1) commit re-sets the flag, and (2) `cat >> MEMORY.md` via Bash does not clear it. Reproduction proved only #1 is real. `cat >> .../MEMORY.md` DOES clear correctly (the Bash branch's `is_memory` check matches ".claude/memory"/"MEMORY.md" and removes the flag). What looked like "cat didn't clear" was actually the arrow-bug re-setting the flag in a *later* command (the very `git commit` that got blocked, whose message held an arrow). 
Failure mode named: I theorized two causes from memory/recollection instead of reproducing first. The Debugging Protocol says reproduce the delta before hypothesizing; doing so collapsed two imagined bugs into one real one and corrected a claim I had already made to the user. Lesson: when reporting a bug's cause, reproduce before asserting, especially before telling the user "it's X and Y."

## Fix
In the Bash branch: compute `is_pure_git` by splitting the command on `&& || ; | \n` and testing whether EVERY segment starts with `git ` (or is bare `git`). If pure-git, `is_write` is forced false. Rationale: a git VCS operation never AUTHORS project content that needs a beat - `git commit` is what CONSUMES a beat. A compound that mixes git with a non-git writer (e.g. `sed -i x && git add`) still falls through to normal write detection, so genuine writes chained after git still dirty correctly. Also removed the dead `is_git_read` variable (it was defined but never referenced in the gate condition).

## Verification
New regression test `claude/hooks/test-memory-nudge.sh` (11 cases, all pass, exit 0): commit-with-arrow -> clean; plain commit -> clean; add-only -> clean; add+commit compound with arrow/redirect chars -> clean; `cat >> MEMORY.md` -> clears; real `sed -i` write -> dirties; mixed `sed -i && git add` -> dirties; read-only echo -> clean; plus the Write/Edit path branch (beat write clears, MEMORY.md write clears, source write dirties). `bash -n` clean. Matches the repo's existing test-*.sh hook-test convention.

## Files
- claude/hooks/memory-nudge.sh (is_pure_git exemption; dead var removed)
- claude/hooks/test-memory-nudge.sh (new, 11-case regression)
