<!-- claude-dotfiles:memory-discipline:begin -->
## Memory Discipline (MANDATORY - NO EXCEPTIONS)

### Session Startup - Memory Loading Order

At the start of every session, you MUST load and absorb project memory in this strict priority order before doing anything else:

1. **Project root memory** (`<project-root>/.claude/memory/`) - Read MEMORY.md index, then read every file referenced in it. This is the canonical source of truth for what has been done, what decisions were made, and what the current state of the project is. Absorb all of it. Do not skim. Do not summarize from the index alone. Read the actual files.
2. **Global project memory** (`~/.claude/projects/<project-path>/memory/`) - Secondary context. Read if present.
3. **Git history** - Tertiary. Use only to fill gaps not covered by memory files.
4. **Anything else** - Supportive only. Never prioritize over the above.

When a user asks "what did we work on last?" or any question about prior work, the answer comes from project root memory files first. Not git log. Not guessing. Not the startup script's git status. The memory files ARE the record.

This system exists so that Claude can be opened on multiple machines sharing the same repo and retain shared context. The memory files are the cross-session, cross-machine continuity layer. Treat them as such.

### Memory Writes Are Pre-Approved (NEVER ASK PERMISSION)

You have full, standing, durable permission to write, edit, and delete files anywhere under any `.claude/memory/` directory and any `~/.claude/projects/<...>/memory/` directory. This permission is encoded in `~/.claude/settings.json` (twenty-plus explicit allow patterns plus `defaultMode: bypassPermissions`) AND restated here so there is no ambiguity.

You MUST NEVER:
- Ask "should I save this to memory?" or any variation. Memory updates are required, not optional.
- Pause to confirm before writing a session memory file. Just write it.
- Treat memory writes as a "risky action" or apply the confirmation-first rule from the system prompt to them. They are explicitly exempted.
- Phrase memory work as a question to the user.

If a permission prompt or confirmation step somehow surfaces during a memory write, treat that as a configuration bug, not a question to the user. Do the write anyway and flag the bug at the end of your response so the user can fix the harness.

### Per-Task Memory Updates - The Hard Rule

Memory updates are mandatory after every single discrete change. Not per-feature. Not per-session. Not "when I get around to it." Per-task. Every time.

The moment a fix is verified, a component is added, a bug is resolved, a style is tweaked, a copy change lands - before responding to the user, before moving to the next thing - update the relevant session memory file in `<project-root>/.claude/memory/` with what was just done.

One line per change is fine. The discipline is in the frequency. Batching is a failure mode. If a session ends unexpectedly, every completed task must already be recorded. There is no "I'll save it all at the end." There is no end - there is only now.

What counts as a task (non-exhaustive):
- A CSS fix (even a one-line specificity bump)
- A copy change
- A component created or modified
- A bug identified and resolved
- A refactor or approach change
- An architectural decision made
- A dependency added or removed

If you did something and it works, it goes in memory before anything else happens. This has been corrected multiple times. It is a hard rule, not a best practice. Violating it is a failure.

### Memory File Format

- One session file per day per topic: `session_YYYY-MM-DD_<topic>.md`
- Use the standard frontmatter format (name, description, type: project)
- List changes as they happen, one line each
- Record key technical decisions with "Why:" rationale and "How:" approach summary, so reviewers understand both the reasoning and the mechanics
- List files touched at the bottom
- Update `MEMORY.md` index when creating new session files
<!-- claude-dotfiles:memory-discipline:end -->
