---
name: Automated MEMORY.md compaction - stops the beats index teetering over the load budget
description: Jonah asked to AUTOMATE shrinking MEMORY.md (it kept teetering over the ~24.4KB harness load limit, so the index silently truncated and Claude worked half-blind). Built compact-memory.py (line-cap + archive-oldest-session-by-date, never archive standing rules, zero data loss) + memory-compact.sh wrapper, wired PostToolUse(Write/Edit/MultiEdit on MEMORY.md) + SessionStart. Ran once: 72KB/236 -> 23.1KB/116 index + 120 archived.
type: project
relates_to: [feedback_shortcuts_are_lies.md, session_2026-06-05_grounding-gate-mechanism.md]
---

Collaborator: Jonah. 2026-06-05.

## Root cause (grounded by analyzing the file, not guessing)
MEMORY.md was 72062 bytes vs the harness ~24.4KB (24986-byte) load limit -> the system loads "only part of it" -> the index Claude relies on at session start silently truncated. Two causes: (1) VERBOSE entries - 152 of 236 over the 200-char rule (median 249, max 1002); (2) UNBOUNDED growth - 212 of 236 were dated session_ beats that accumulate forever. This is the structural break behind Jonah's earlier "something off about the Beats system."

## Fix (mechanical, zero data loss)
- claude/hooks/compact-memory.py: (1) line-cap every index entry to MAX_LINE=200 chars (the index is pointers + a short hook; full detail lives in the beat file, so capping the line loses nothing). (2) If still over BUDGET=23000 bytes, ARCHIVE the oldest dated session_/reflection_ entries (by YYYY-MM-DD in the filename) into MEMORY-archive.md until under budget. STANDING entries (feedback_/decision_/reference) are NEVER archived. Pointers are MOVED not deleted; beat FILES untouched + still grep-able. Idempotent (only rewrites when changed, so it never fights an in-progress edit).
- claude/hooks/memory-compact.sh: PostToolUse wrapper - reads the edited file_path; runs the compactor only when it is a MEMORY.md; no-op otherwise. SessionStart fallback (no file_path) compacts the current project's index.
- settings.json: PostToolUse matcher "Write|Edit|MultiEdit" (NOT Bash, so it does not fire on every shell command) + SessionStart (insurance before load). Both -> memory-compact.sh.

## Verified
- One-time run on the REAL index: 236 entries/72062 bytes -> 116 index + 120 archive (116+120=236, zero loss), 23148 bytes (< 24986). All 10 feedback_ + 8 decision_ + 1 reference standing rules kept (incl. shortcuts-are-lies). Backup at /tmp/MEMORY.before.md.
- Synthetic hook test (405 entries/118KB): hook fired from a fake PostToolUse payload -> 114 index + 291 archive, 23142 bytes under limit; idempotent re-run = no change; non-MEMORY write ignored. (A grep typo in the test - `]\(feedback_` - errored on the standing-count line; standing preservation is proven by the real run.)
- settings.json valid JSON; both wirings present; symlinks resolve + executable.

## Honest scope / leaks
- "Most recent ~116" by date is what stays in the live index; older session pointers live in MEMORY-archive.md (grep-on-demand). A standing rule is kept regardless of age (by prefix), so foundational rules never fall out.
- Line-cap is by CHARS; multibyte arrows/ellipses make a few lines slightly >200 BYTES - irrelevant, the file budget (bytes) is the real constraint and is met with headroom.
- This keeps the index LOADABLE; it does not make beats well-WRITTEN. The one-line-terse discipline still matters (now also enforced mechanically by the cap).

## Files
- claude/hooks/compact-memory.py, claude/hooks/memory-compact.sh (new, symlinked live)
- claude/settings.json (PostToolUse + SessionStart wiring)
- .claude/memory/MEMORY.md (compacted), .claude/memory/MEMORY-archive.md (new, holds 120 archived pointers)
