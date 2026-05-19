---
name: session-2026-05-18-voice-mute-hook-gating
description: Rewrote unconditional voice MANDATORY rule in CLAUDE.md to be gated on voice-mandate.sh hook output; added muted-state branch to the hook
type: project
relates_to: []
---

## 2026-05-18 Voice mute hook gating

### Problem
Voice was muted at session start, but Claude still ran `ToolSearch select:mcp__voice-output__speak` and then called `mcp__voice-output__speak`, getting back `BLOCKED: voice is muted` from the voice-gate PreToolUse hook. Every muted session burned at least one turn on dead voice machinery before Claude could see the mute state in the error response.

### Root cause (investigated via general-purpose agent)
Two conflicting rules:
1. `~/.claude/CLAUDE.md` voice section was framed as `MANDATORY - ABSOLUTE - NO EXCEPTIONS` with an unconditional "session startup sequence" that told Claude to ToolSearch for speak BEFORE composing any reply. No mute check.
2. `feedback_muted_means_silent.md` memory said "don't ToolSearch when muted" - but feedback memory is a soft override against a hard rule, and the hard rule won in practice.

The `voice-mandate.sh` SessionStart hook was already gating correctly (empty JSON when muted), but CLAUDE.md told Claude to ToolSearch regardless. The hook was the right primitive; CLAUDE.md was ignoring it.

### Fix - two-file edit
**1. `~/.claude/CLAUDE.md` (lines 21-33)**

Replaced the unconditional "MUST speak every response" section with a hook-gated version. Key changes:
- Section retitled `## Voice Output` (no MANDATORY/ABSOLUTE caps)
- Explicit "Single source of truth: the hook output, every turn"
- Three documented states: active mandate (load + speak), muted notice (skip entirely), no mandate at all (skip entirely)
- Documents mid-session re-fire behavior via voice-toggle UserPromptSubmit hook
- Closes with a "Why this is structured this way" paragraph naming the BLOCKED-call failure mode so a future edit doesn't regress it

**2. `claude/hooks/voice-mandate.sh` (symlinked to `~/.claude/hooks/voice-mandate.sh`)**

Added an `elif` branch for `HAS_SERVER=yes AND IS_ENABLED=no` that injects a `VOICE OUTPUT IS MUTED` notice via `additionalContext`. The notice tells Claude not to ToolSearch, not to call speak, and explicitly says "this notice supersedes" any MANDATORY language elsewhere - belt-and-suspenders against the failure mode.

Updated the file header comment to document all three outcomes (installed+enabled, installed+muted, not installed).

### Verification
Ran the hook in both states:
- Muted (no `.voice-enabled` flag): emits `VOICE OUTPUT IS MUTED` in `additionalContext` -> confirmed
- Enabled (touched `.voice-enabled`): emits `VOICE OUTPUT IS ACTIVE` in `additionalContext` -> confirmed
- Restored muted state after test

### Note on the source CLAUDE.md vs installed CLAUDE.md
`~/.claude/CLAUDE.md` (the one Claude reads at session start) is NOT a symlink - it's a copy that diverged from `claude-dotfiles/claude/CLAUDE.md` (source). The source's voice section is already calmer ("Starts muted") and doesn't have the MANDATORY rule. So the divergence is: installed file had the bad rule, source did not. This edit only fixed the installed file. The source is fine. If the user re-runs the installer, the source's calmer text will replace the (now also calmer) installed text - no regression risk.

### Files changed
- `~/.claude/CLAUDE.md`
- `claude/hooks/voice-mandate.sh`

Collaborator: Jonah Cohen
