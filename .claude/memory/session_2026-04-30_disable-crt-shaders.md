---
name: Disable CRT shader chain in ghostty config
description: Commented out bettercrt.glsl and tft.glsl in both the repo config (ghostty/config.ghostty) and the deployed copy (~/Library/Application Support/com.mitchellh.ghostty/config.ghostty). cursor_blaze.glsl stays active.
type: project
---

Collaborator: Jonah Cohen

# What changed

Both `bettercrt.glsl` and `tft.glsl` `custom-shader` lines are commented out in:

- `ghostty/config.ghostty` (the repo source, with `__DOTFILES_DIR__` placeholder)
- `~/Library/Application Support/com.mitchellh.ghostty/config.ghostty` (the deployed copy, with absolute path already substituted)

`cursor_blaze.glsl` remains active. The screen effect (CRT scanlines + TFT) is off; the cursor particle trail still runs.

# Why

User asked to comment out the CRT feature. Per the 04-24 shader-chain memory, bettercrt + tft were added together as the screen-effect bundle, separate from cursor_blaze. The user confirmed option (b) - both shaders.

# How

Both files got the same two-line block:

```
# CRT screen effect disabled
# custom-shader = .../bettercrt.glsl
# custom-shader = .../tft.glsl
custom-shader = .../cursor_blaze.glsl
```

The deployed file is a copy, not a symlink, because ghostty silently ignores symlinks in Application Support (per the 04-24 ghostty-config-symlink memory). Editing only the repo file would have been a no-op until the next install.sh run, so both files were edited.

# Verification

- `grep -n custom-shader` on both files confirms the bettercrt and tft lines are commented and cursor_blaze is still active.
- Visual verification (does ghostty actually drop the CRT effect on next launch) is up to the user since this requires restarting ghostty.

# Files touched

- `ghostty/config.ghostty`
- `~/Library/Application Support/com.mitchellh.ghostty/config.ghostty` (outside repo)
- `.claude/memory/session_2026-04-30_disable-crt-shaders.md` (this file)
- `.claude/memory/MEMORY.md` (index entry)

# Open knowns

- A future `ampersand --only ghostty` or `ampersand --personal` run will overwrite the deployed file from the repo source. Since the repo source also has the lines commented, the disable will persist through reinstalls. To re-enable, uncomment in `ghostty/config.ghostty` and rerun the ghostty component install.
