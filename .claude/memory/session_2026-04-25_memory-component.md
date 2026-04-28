---
name: New `memory` TUI component - additively wires Memory Discipline rules + hooks + loader
description: Added a `memory` component that bolts our memory subsystem onto an existing Claude Code without overwriting CLAUDE.md or settings.json. Appends the Memory Discipline section between marker comments, JSON-merges three hooks idempotently via python3, symlinks startup-check.sh.
type: project
---

Collaborator: Jonah Cohen

# What changed

## install.sh

Added `memory` as the 2nd component (between `claude` and `skills`). Default-on. Three idempotent operations when picked:

1. **Symlink `startup-check.sh`** - via `make_symlink`. Already-correct symlinks are a no-op.
2. **Append Memory Discipline section to user's CLAUDE.md** - extracts the marker-bounded block from `claude/CLAUDE.md` using `awk` and appends to `~/.claude/CLAUDE.md`. Skipped if our begin marker is already present in the user's file. Creates the file via `touch` if missing.
3. **JSON-merge three hooks into user's settings.json** - via inline python3 (stdlib only). Adds `SessionStart`, `PreCompact`, `PostCompact` hook entries if not already present. Detection uses substring search on `startup-check.sh` (for the loader-based hooks) and `PreCompact: flushing pending memory` (for the inline reminder). Backs up the existing settings.json once before first write. Creates `{}` if the file is missing.

## claude/CLAUDE.md

Wrapped the existing `## Memory Discipline (MANDATORY - NO EXCEPTIONS)` section in HTML comment markers:
- `<!-- claude-dotfiles:memory-discipline:begin -->`
- `<!-- claude-dotfiles:memory-discipline:end -->`

These markers serve dual purpose: they let install.sh's `awk` extract the block cleanly for additive append, AND they're invisible in rendered markdown so they don't pollute the user's CLAUDE.md visually.

## TUI metadata

- KEYS array now: `(claude memory skills ghostty shaders cmux discord nvm yesplease)` - 9 components
- `--preset minimal` resolves to `claude + memory + skills + nvm`
- `--help` valid-keys list includes `memory`
- Post-install summary has a `picked memory && echo "..."` line

## README.md

- Component table inserts a `memory` row between `claude` and `skills`
- "Boost an existing Claude Code setup without overwriting it" subsection rewritten with a clear "additive components" list and three concrete example commands (`yesplease --only memory`, `--only memory,skills`, `--only memory,skills,yesplease`)
- Documents the markers, undo procedure, and what each additive component touches

# Why

User flagged that the team's primary need is beefing up an existing Claude Code with memory capability without losing their config. The previous TUI required picking `claude` (full overwrite) for memory features. Splitting `memory` out as a standalone additive component means:

1. The team can add `--only memory` to a one-liner curl install and get the full memory subsystem (rules + hooks + loader) without touching their CLAUDE.md or settings.json structure.
2. Coexistence with `claude` is fine - if both are picked, settings.json is symlinked to ours (which has the hooks) and the memory block detects "marker already present" and skips. No double-append.
3. Clean undo path: delete between markers in CLAUDE.md, remove the three hook entries from settings.json. No file-replacement to revert.

# Verification done

- `bash -n install.sh` syntax clean
- All `--dry-run` flag combinations resolve correctly
- Standalone test of the python merge in a temp dir: first run produces 40-line settings.json with all three hooks; second run keeps it at 40 lines (idempotent)
- Awk extraction against the marked CLAUDE.md returns the bounded block (markers inclusive)

# Open question / future work

Mutual coexistence between `claude` and `memory`: tested by code path, not by a real run. The marker grep in the user's CLAUDE.md should detect that `claude`'s symlink already provides our marker and skip the append. Worth a manual run on the user's machine to confirm.

If the user picks `memory` then later picks `claude`, the symlink replaces their (already-merged) CLAUDE.md/settings.json with ours - their additive merges become moot but no data is lost (originals were backed up before claude's first run).

# Files touched

- `install.sh` (component split, apply section, preset/help/summary updates)
- `claude/CLAUDE.md` (marker comments around Memory Discipline section)
- `README.md` (component table + Boost an existing setup subsection)
- `.claude/memory/session_2026-04-25_memory-component.md` (this file)
- `.claude/memory/MEMORY.md` (index entry)
