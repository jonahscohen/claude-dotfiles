---
name: Animated purple gradient on TUI component titles
description: Replaced gum's flat pink (`--foreground 212`) on component title lines with a one-shot shimmer reveal that settles to a static purple-to-pink gradient. Custom bash function emits 24-bit ANSI per character with a brighter highlight band sweeping left-to-right.
type: project
---

Collaborator: Jonah Cohen

# What changed

`install.sh` got a new `print_title_animated()` function used inside `run_tui_gum` to replace `gum style --foreground 212` on the component title lines.

## How it works

- Static gradient: per-character interpolation from deep violet `#7c3aed` (124,58,237) at position 0 to magenta `#ec4899` (236,72,153) at position len-1.
- Shimmer: a 5-character-wide highlight band (peak `#fbcfe8` / 251,207,232) sweeps from off-screen-left to off-screen-right across 6 frames at 30ms each (~180ms per title). Per-character intensity falls off linearly with distance from the band center.
- Each frame: `\r\033[K` returns to start of line and clears, then per-character `\033[38;2;R;G;Bm<char>` emits the color + character.
- Final settle frame: pure static gradient with no shimmer overlay, ending with `\033[0m\n`.
- Total animation cost: ~1.6s for 9 component titles. Acceptable upfront cost in exchange for the vibe.

## Why this shape

Gum doesn't expose gradient or animation primitives natively, so the title styling had to be raw ANSI. The shimmer-then-settle shape was picked over continuous-animation because gum's interactive picker (`gum choose`) owns the terminal once it starts, which makes continuous animation impractical without forking a background paint loop. One-shot reveal at print time gets the "animated" beat without fighting the picker.

## Constraints

- Requires a 24-bit-color terminal (Ghostty/iTerm2/Terminal.app/kitty/alacritty all qualify on macOS). On terminals that strip the escapes, text still prints; just without the gradient. No graceful-fallback branch is needed because the function never errors - degraded output is still readable.
- Bash-3.2-safe: uses C-style `for ((...))` loops + arithmetic ternaries, no associative arrays.
- Forks per frame: `sleep 0.03` is one fork per frame × 6 frames × 9 titles = 54 forks total, ~10-20ms overhead. Negligible.

# Files touched

- `install.sh` (new `print_title_animated` function, replaced two gum-style calls in `run_tui_gum`)
- `.claude/memory/session_2026-04-25_gradient-titles.md` (this file)
- `.claude/memory/MEMORY.md` (index entry)
