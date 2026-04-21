---
name: Cursor blaze shader tuning
description: Iterated on cursor_blaze.glsl - removed threshold, added particles/glow/shockwave, then pared back for performance. Final state is trail + 12 sparks, no glow, no shockwave, no dust.
type: project
---

## Shader tuning session

- Removed `DRAW_THRESHOLD` (1.5 -> 0.0) so every cursor movement triggers the blaze
- Added particle burst system (48 particles + 30 dust + shockwave + glow)
- Crashed the machine - too much GPU work per keystroke
- Pared down to 12 particles, 0 dust
- Removed shockwave ring
- Removed central glow and secondary glow
- Final state: parallelogram trail + 12 sparks only
- Duration: 0.8s, particle speed: 0.35, particle size: 0.003

## Known limitation

- Ghostty shaders don't visually fire inside Claude Code (or any TUI app that hides the terminal cursor), because the shader depends on `iCurrentCursor`/`iPreviousCursor` uniforms which only update when Ghostty's native cursor moves
- Effect works in regular shell (bash/zsh) but not inside Claude Code's TUI

## Files touched

- `shaders/cursor_blaze.glsl` - major rewrite with particle system
- Deployed copy at `~/Documents/Github/ghostty-shaders/cursor_blaze.glsl`
