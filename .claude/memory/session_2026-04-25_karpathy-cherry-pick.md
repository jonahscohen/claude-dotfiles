---
name: Cherry-picked two rules from Karpathy-skills repo into CLAUDE.md
description: Added a "name multiple interpretations" rule to Code Quality and a "non-UI plan with verify clauses" rule to Verification Protocol. Skipped the rest of the Karpathy guidelines because Claude Code's system prompt and existing CLAUDE.md already cover them.
type: project
---

Collaborator: Jonah Cohen

# What changed

Two surgical additions to `claude/CLAUDE.md`:

1. **Code Quality** got a new first bullet: "When the request has multiple plausible interpretations, name them and ask. Don't silently pick one and run with it."
2. **Verification Protocol** got a new item 7: "For non-UI tasks, state a verifiable plan first." Requires `<step> -> verify: <check>` lines before multi-step refactors / CLI work, with verify clauses that are runnable commands, not vibes.

# Why

User asked whether to import the [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) CLAUDE.md wholesale. Read the file: four principles - Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution.

Three of the four are already enforced by:
- Claude Code's default system prompt ("Don't add features... Don't add error handling for impossible scenarios... A bug fix doesn't need surrounding cleanup")
- The existing Verification Protocol (visual + interactive + completeness verification, "no lazy questions," "no false positives")

So importing the whole file would be exactly the kind of bloat the existing rules tell Claude not to do. The two surgical additions cover the genuinely novel bits:
- "Multiple interpretations" rule: Claude does silently pick one when a request is ambiguous; this is a real failure mode not covered elsewhere.
- "Non-UI plan with verify clauses": existing Verification Protocol is heavily UI-focused (screenshots, click testing). Backend / CLI / refactor work has no equivalent gate. The `<step> -> verify: <check>` template closes that gap.

# How to apply

Both rules apply automatically via CLAUDE.md propagation through the dotfiles symlink chain. No project-level changes needed.

# Files touched

- `claude/CLAUDE.md` (two surgical additions)
- `.claude/memory/session_2026-04-25_karpathy-cherry-pick.md` (this file)
- `.claude/memory/MEMORY.md` (index entry)
