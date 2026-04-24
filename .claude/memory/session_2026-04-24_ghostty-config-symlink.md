---
name: Ghostty config cross-machine sync (copy + tilde path)
description: Ghostty on macOS silently ignores symlinks in Application Support - config must be copied. Shader path uses ~ expansion so the repo file is byte-identical to deployed and no placeholder is needed.
type: project
---

## Finding (Jonah Cohen)

Ghostty on macOS does NOT follow symlinks at `~/Library/Application Support/com.mitchellh.ghostty/config.ghostty`. Replacing the file with a symlink to the repo caused Ghostty to fall back to defaults (no fonts, no colors, no shader) with no visible error. Reverting to a real file restored the config immediately.

## Why

We wanted cross-machine sync to work the same way for Ghostty as for Claude Code and cmux (symlink, then commit + pull). The experiment failed because Ghostty's config loader rejects symlinks in Application Support silently - either via sandboxing/TCC or an internal realpath check. No log output, just a blank default appearance.

## Outcome

Kept `install.sh` in COPY mode for the Ghostty config. BUT dropped the `__DOTFILES_DIR__` placeholder and sed substitution - the repo file now uses `~/Documents/Github/claude-dotfiles/shaders/cursor_blaze.glsl` directly, which Ghostty expands at load time. This means the repo file is byte-identical to the deployed file, so `cp` is a pure copy with no per-machine munging.

Sync model for Ghostty config:
- Edit `ghostty/config.ghostty` in the repo.
- Commit + push.
- On other machine: `git pull` + `./install.sh` (re-run the installer to copy over).

install.sh also warns if the clone is not at `~/Documents/Github/claude-dotfiles` (case-insensitive compare, since APFS is case-insensitive by default on macOS) because the shader path is pinned to that location.

## How

- `ghostty/config.ghostty`: `custom-shader = ~/Documents/Github/claude-dotfiles/shaders/cursor_blaze.glsl` (tilde expansion).
- `install.sh`: `cp` + `backup_if_exists`, plus the canonical-path warning guard. No more `sed`.
- `README.md`: "How it works" now explicitly calls out that Ghostty config is copied, not symlinked, with the reason.

## Files touched

- `ghostty/config.ghostty`
- `install.sh`
- `README.md`
- `~/Library/Application Support/com.mitchellh.ghostty/config.ghostty` (deployed as a real file, previous state in `.backups/20260424-023521/` and `.backups/20260424-02xxxx/` from the re-runs today)

## Notes / Gotchas

- DO NOT attempt to symlink the Ghostty config into Application Support again. It silently breaks and looks like "all my theming disappeared". If a future Ghostty release fixes this, that's the signal to try again.
- Possible alternative not yet tested: symlinking `~/.config/ghostty/config` (the XDG path) instead. Ghostty may check that path on macOS too, and it may allow symlinks. If someone wants zero-touch sync later, that's the experiment to try next.
- Drift risk: direct edits to the deployed file will silently diverge from the repo, because the deployed file is now a distinct copy on disk. Mitigation convention: always edit the repo file and re-run `./install.sh`. No automated drift guard is in place yet.
