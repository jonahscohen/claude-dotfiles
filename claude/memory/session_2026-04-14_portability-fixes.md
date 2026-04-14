---
name: Ghostty placeholder + discord launcher auto-wire
description: Fix two portability gaps in claude-dotfiles - Ghostty config path-pong between machines, and discord-chat-launcher.sh being inert without a .zshrc source line
type: project
---

Fixed two portability gaps surfaced by Claude running on a second machine.

## Gap 1: Ghostty shader path-pong

Previously, `ghostty/config.ghostty` held a hardcoded absolute path to the shaders dir. `install.sh` sed-rewrote that path IN the repo file through the symlink, so the repo file always ended up with the last-installing machine's home dir baked in. Every other machine saw it as a diff on next pull and rewrote it back. Found evidence in the old commented-out `/Users/spare3/...` line proving the churn.

**Fix:** Repo file now uses `__GHOSTTY_SHADERS_DIR__/cursor_blaze.glsl` placeholder. `install.sh` COPIES (not symlinks) the config to the ghostty app-support dir and substitutes the placeholder in the copy. Repo file stays clean across machines.

**Tradeoff:** editing the ghostty config no longer live-syncs through a symlink. Changes require re-running `install.sh` on each machine after pull.

## Gap 2: discord-chat-launcher.sh inert

The launcher defines a `claude()` function that shadows the real command to optionally connect Discord. Symlinking the file into `~/.claude/` does nothing; `~/.zshrc` must `source` it. This step was not in README, install.sh, or install output. Silently incomplete on any fresh machine.

**Fix:** `install.sh` now appends a source line to `~/.zshrc` if not already present. Detection uses `grep -Fq "discord-chat-launcher.sh"` so it matches BOTH a pre-existing un-marked line (like the one I had) and a marker-guarded one added by the installer. Missing `.zshrc` is warned, not errored.

**Bug caught live during verification:** first version of the detection grepped for the marker comment only. Pre-existing un-marked source line on this machine was missed, installer appended a duplicate. Fixed detection to grep by script name, then removed the duplicate from `.zshrc`. Lesson: idempotency checks must match ALL historical forms, not just the current one.

## Files touched

- `ghostty/config.ghostty` (placeholder + dropped stale /Users/spare3/ comment)
- `install.sh` (ghostty section: copy + sed-on-copy; new discord section)
- `README.md` (accurate portability model for both)
- `~/.zshrc` (removed the installer's duplicate append; pre-existing line retained)
