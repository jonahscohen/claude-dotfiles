---
name: Split statusline into its own a-la-carte TUI component
description: Statusline-command.sh symlink moved out of the `claude` apply block into a new `statusline` component. settings.json's statusLine command is now tolerant of a missing script, so unticking statusline cleanly falls back to Claude Code's default with no errors.
type: project
---

Collaborator: Jonah Cohen

# What changed

## install.sh

- New `statusline` component (4th in KEYS, default-on). Title: "Custom statusline (bottom-of-window prompt bar)".
- Apply block (`# 4. Custom statusline`) symlinks `~/.claude/statusline-command.sh` and chmod +x's the source. Inserted between `skills` (#3) and Ghostty shaders (renumbered to #5). Subsequent sections renumbered through #10.
- The `claude` apply block no longer symlinks `statusline-command.sh` or chmod's it. Statusline ownership is fully on the new component.
- `--help` valid keys list: `claude, memory, skills, statusline, ghostty, shaders, cmux, discord, nvm, yesplease` (10 components).
- Post-install summary gained a `picked statusline && echo "..."` line and dropped "statusline" from the `picked claude` line.

## claude/settings.json

The statusLine command changed from:
```
bash ~/.claude/statusline-command.sh
```
to:
```
[ -x ~/.claude/statusline-command.sh ] && bash ~/.claude/statusline-command.sh || true
```

The `[ -x ... ]` test passes only if the script exists and is executable. If the user unticks `statusline`, the script isn't symlinked, the test fails, the `&&` short-circuits, and `|| true` keeps the exit status at 0. Claude Code falls back to its default statusline rendering.

## README.md

New row in the component table for `statusline` between `skills` and `ghostty`. Plain-English: "Tick to use ours; untick to fall back to Claude Code's default."

# Why

User asked for statusline to be a-la-carte. Previously it was bundled with the `claude` component (no opt-out). Splitting it out matches the existing pattern of additive components (memory, skills) where each capability is independently toggleable.

# Why this approach over JSON-merging the statusLine block

Two options were considered:
1. **Keep statusLine in canonical settings.json, control script symlink via the new component (chosen)** - simplest, no JSON-merge complexity. Tradeoff: when statusline is unticked, settings.json still has the statusLine block; the missing-script tolerance in the command makes this a clean no-op.
2. **Remove statusLine from canonical, JSON-merge it in via the new component (rejected)** - cleaner conceptually but introduces the symlink-write-through problem. When `claude` is also picked, settings.json is symlinked to the canonical repo file; a JSON merge would write through and dirty the repo's settings.json on every install. Avoiding that would require either copy-instead-of-symlink semantics for settings.json (bigger refactor) or split settings.json into base + fragment files (more bigger refactor).

Option 1 is slightly less elegant but avoids architectural rework. The tolerance pattern (`[ -x SCRIPT ] && ... || true`) is the small concession that makes it work cleanly.

# Files touched

- `install.sh` (component split, apply section, renumbering, help/summary updates)
- `claude/settings.json` (statusLine command tolerance)
- `README.md` (new row in component table)
- `.claude/memory/session_2026-04-28_statusline-component.md` (this file)
- `.claude/memory/MEMORY.md` (index entry)
