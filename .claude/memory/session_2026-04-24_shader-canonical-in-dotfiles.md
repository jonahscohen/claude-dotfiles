---
name: cursor_blaze.glsl canonicalized to claude-dotfiles
description: Ghostty now loads cursor_blaze.glsl directly from claude-dotfiles/shaders so repo edits sync live. ghostty-shaders clone copy is no longer the deployed artifact.
type: project
---

## Change

Before: `shaders/cursor_blaze.glsl` was copied into `~/Documents/Github/ghostty-shaders/cursor_blaze.glsl` by install.sh, and Ghostty loaded that copy. Edits to the dotfiles source only took effect after a re-run of install.sh (and only if the destination copy was missing, because the copy was guarded by `! -f`).

After: Ghostty loads `~/Documents/GitHub/claude-dotfiles/shaders/cursor_blaze.glsl` directly. Edits to the repo file are picked up on the next Ghostty config reload.

## Files touched

- `ghostty/config.ghostty` - placeholder changed from `__GHOSTTY_SHADERS_DIR__/cursor_blaze.glsl` to `__DOTFILES_DIR__/shaders/cursor_blaze.glsl`
- `install.sh` - removed the "copy cursor_blaze.glsl into ghostty-shaders" block; sed substitution now rewrites `__DOTFILES_DIR__` to `$REPO_DIR`; summary line updated
- `~/Library/Application Support/com.mitchellh.ghostty/config.ghostty` - patched in place with the absolute path to the dotfiles shader so the change takes effect without re-running install.sh

## Notes

- The ghostty-shaders community repo is still cloned by install.sh for access to the rest of the shader library; only the cursor_blaze deploy step was removed.
- Case matters: the config uses `GitHub` (capital H) to match the actual repo path on this machine. The old shader path used lowercase `Github` from the ghostty-shaders clone - don't copy that style back in.
- Known limitation from 2026-04-21 still applies: the shader doesn't visually fire inside Claude Code's TUI because `iCurrentCursor`/`iPreviousCursor` only update when Ghostty's own cursor moves.
