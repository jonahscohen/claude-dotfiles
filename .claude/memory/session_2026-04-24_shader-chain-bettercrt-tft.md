---
name: Bundle bettercrt + tft shaders into dotfiles repo
description: Copied bettercrt.glsl and tft.glsl out of the ghostty-shaders clone into claude-dotfiles/shaders/ and chained them with cursor_blaze in config.ghostty so all three shaders sync live from the repo.
type: project
---

Collaborator: Jonah Cohen

# What changed

- Copied `bettercrt.glsl` (1,256B) and `tft.glsl` (572B) from `~/Documents/Github/ghostty-shaders/` into `shaders/` in this repo. Originals left in place so `install.sh`'s `git pull` of ghostty-shaders stays clean (deleting from the community clone would create local modifications that fight the pull).
- `ghostty/config.ghostty`: replaced the single `custom-shader = .../cursor_blaze.glsl` line with three, in declaration (= pipeline) order:
  1. `bettercrt.glsl` - CRT curvature + scanline darkness
  2. `tft.glsl` - TFT pixel grid (scanline + grille)
  3. `cursor_blaze.glsl` - cursor trail, composited on top
- `install.sh`: updated the in-repo shader comment and the summary line to mention all three shaders.
- `README.md`: updated the `shaders/` row in the contents table and the `**Ghostty:**` explainer paragraph to reference `shaders/*.glsl` instead of only cursor_blaze.
- Redeployed `config.ghostty` to `~/Library/Application Support/com.mitchellh.ghostty/` via `cp` so Ghostty picks up the new chain on next restart (the install-time copy pattern, not symlink - symlinks are silently ignored there).

# Why

User asked to bring these two shaders into the dotfiles repo and "match the pattern set for blaze.glsl". The existing pattern was: file lives at `shaders/<name>.glsl`, referenced from config via `~/Documents/Github/claude-dotfiles/shaders/<name>.glsl`, loaded in place so edits sync across machines without an install.sh re-run.

# How

Ghostty supports multiple `custom-shader` directives and chains them in declaration order - each shader's output is the next shader's `iChannel0` input. Ordering choice: curvature warp first (so scanlines and cursor trail sit on a curved surface), pixel grid second, cursor effect last so the cursor is drawn crisp on top of the retro treatment.

# Files touched

- `shaders/bettercrt.glsl` (new, copied from ghostty-shaders)
- `shaders/tft.glsl` (new, copied from ghostty-shaders)
- `ghostty/config.ghostty`
- `~/Library/Application Support/com.mitchellh.ghostty/config.ghostty` (redeployed copy)
- `install.sh`
- `README.md`
- `.claude/memory/MEMORY.md` (index entry)
