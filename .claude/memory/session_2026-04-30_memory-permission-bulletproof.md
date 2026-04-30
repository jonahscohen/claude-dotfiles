---
name: Bulletproof memory-write permission (settings.json + CLAUDE.md + feedback memory)
description: Triple-layered fix for memory-write permission prompts. settings.json gains nine more allow patterns (12 -> 21 memory/md rules). CLAUDE.md gets a new "Memory Writes Are Pre-Approved (NEVER ASK PERMISSION)" section above the existing per-task rule. A feedback_memory_writes_preapproved.md file in the global auto-memory captures the user's verbatim Discord voice instruction.
type: project
---

Collaborator: Jonah Cohen

# What changed

Three layers of defense so memory writes never trigger a permission prompt and so future-Claude never asks "should I save this?":

1. `claude/settings.json` `permissions.allow`: nine new patterns added on top of the twelve from the 04-30 morning pass. Now covers:
   - `Write|Edit|MultiEdit(/Users/**/memory/**)` (any user, any depth, macOS)
   - `Write|Edit|MultiEdit(/home/**/memory/**)` (Linux/WSL parity)
   - `Write|Edit|MultiEdit(**/memory/**)` (any path containing /memory/)
   - `Write|Edit|MultiEdit(**/MEMORY.md)` (the canonical index file)

2. `claude/CLAUDE.md` Memory Discipline section gains a new top subsection: "Memory Writes Are Pre-Approved (NEVER ASK PERMISSION)". Explicit forbid list (no asking, no pausing, no confirmation), and instructions for what to do if a prompt somehow surfaces despite the settings ("treat as harness bug, do the write anyway, flag at end of response").

3. `~/.claude/projects/-Users-spare3-Documents-Github-claude-dotfiles/memory/feedback_memory_writes_preapproved.md`: feedback-type memory in the global auto-memory store, captures the user's verbatim Discord voice quote and the why/how-to-apply structure.

# Why

User sent a Discord voice message: "You're still asking me permission to write to memory. Why? You shouldn't be doing that. You have full permission to write to memory. Fix it. Make it mandatory that you have permission to write to memory."

The 04-30 morning pass added six memory-write allow patterns. They were necessary but not sufficient by the user's report. Two possible failure modes:
- Glob mismatch in some Claude Code path-matcher edge case
- Future-Claude misreading the system prompt's "confirm before risky actions" rule as covering memory writes

The triple-layer fix addresses both: more allow patterns (covers the matcher edge case), CLAUDE.md hard rule (covers the model-behavior edge case), feedback memory (re-asserts the user instruction in cross-session storage so future loads always see it).

# How

Settings layer: globs are now bilaterally generic. `**/memory/**` matches any path containing a /memory/ segment, regardless of whether it sits under `.claude/`, a project root, or somewhere else entirely. `**/MEMORY.md` covers the index file specifically since that's edited frequently. `/home/**` parallels `/Users/**` for cross-platform installs.

CLAUDE.md layer: the new subsection appears BEFORE "Per-Task Memory Updates - The Hard Rule" because the permission concern is the gating issue. If a future Claude reads the file top-to-bottom, the no-ask rule arrives first and primes the per-task discipline that follows.

Feedback memory layer: lives in the GLOBAL auto-memory at `~/.claude/projects/-Users-spare3-Documents-Github-claude-dotfiles/memory/`, not the project-root memory. That dir is loaded as second-priority context per the CLAUDE.md memory loading order, so feedback rules persist across sessions even when the project root memory file rotates. The body uses the standard Why/How-to-apply structure for feedback-type memories.

# Verification

- `jq -e '.permissions.allow | map(select(. | contains("memory") or contains(".md"))) | length'` returns 21 (was 12)
- `jq . claude/settings.json` exits 0 (valid JSON)
- All three Write/Edit/MultiEdit triplets present for each new pattern
- CLAUDE.md section sits between "Session Startup - Memory Loading Order" and "Per-Task Memory Updates - The Hard Rule" - verifiable via grep `Memory Writes Are Pre-Approved`
- feedback_memory_writes_preapproved.md exists in global auto-memory and is referenced in MEMORY.md index

# Files touched

- `claude/settings.json` (+9 allow patterns)
- `claude/CLAUDE.md` (new subsection in Memory Discipline)
- `~/.claude/projects/-Users-spare3-Documents-Github-claude-dotfiles/memory/feedback_memory_writes_preapproved.md` (new feedback memory in global auto-memory)
- `~/.claude/projects/-Users-spare3-Documents-Github-claude-dotfiles/memory/MEMORY.md` (index update)
- `.claude/memory/session_2026-04-30_memory-permission-bulletproof.md` (this file)
- `.claude/memory/MEMORY.md` (index entry)

# Open knowns

- If the user is seeing prompts on a different machine, they may be on stale settings.json - they should run `ampersand --pull` to sync the new rules. The 04-30 morning rules + this afternoon's additions both ship in the canonical settings.json, so a pull is sufficient.
- The CLAUDE.md rule says "treat permission prompts as harness bugs" - that's a guidance to keep working, not a license to bypass user intent. If the user explicitly DENIES a memory write at runtime, of course honor that. But the unprompted absence-of-confirm flow should never block.
