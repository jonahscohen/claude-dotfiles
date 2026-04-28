---
name: Add `ampersand` shell shortcut, drop the Makefile
description: Replaced the Makefile-based `make` entry point with `ampersand`, a zsh function appended to .zshrc alongside the existing `yesplease`. ampersand is the no-pull variant - just runs install.sh from the repo. yesplease still does the pull-and-run. Auto-migrates older installs.
type: project
---

Collaborator: Jonah Cohen

# What changed

## Removed

- `Makefile` (the previous `make`-based entry point). User wanted a shell-function-style shortcut instead of a Makefile, so the `make` UX is gone.

## install.sh

- Section 10 ("yesplease vanity shortcut") rewritten as "Shell shortcuts (yesplease + ampersand)".
- Now appends a marker-guarded block with TWO functions to `.zshrc`:
  - `yesplease` - cd into repo, `git pull --ff-only`, run `./install.sh "$@"`
  - `ampersand` - cd into repo, run `./install.sh "$@"` (no pull)
- New marker style: `# === claude-dotfiles:shortcuts:begin ===` / `:end ===` (sed-deletable range, distinct from any user comments).
- Migration logic detects the legacy `# claude-dotfiles vanity command:` marker (yesplease-only block) and replaces it wholesale with the new combined block. Existing users get `ampersand` automatically on their next install.
- Self-heal still works: if `$REPO_DIR` doesn't match the baked path in the existing block, the block is rebuilt at the new path.
- Component title in TUI changed from "'yesplease' shortcut (re-run installer)" to "Shell shortcuts (yesplease + ampersand)". Description updated.
- Post-install summary line updated.

## README.md

- Install block: replaced the `make` examples with `ampersand` examples. `ampersand --preset minimal`, `ampersand --only memory`, etc.
- Component table row for `yesplease` updated to mention both shortcuts.

# Why

User explicitly asked to "change it from `make` to `ampersand`". The two shortcuts now cover different velocities:
- `ampersand` - fast local iteration, no network
- `yesplease` - sync first, then run

Both work from any directory because they're zsh functions in `.zshrc`. No `./install.sh` typing needed.

# Migration path for existing users

Before this change, the `yesplease` component appended a single function block to `.zshrc` with a marker comment. After this change, picking `yesplease` (or running install.sh in any way that triggers this section) detects the old marker, sed-deletes the legacy block, and appends the new combined block. Idempotent: subsequent runs find the new marker and no-op (or refresh if `$REPO_DIR` drifted).

# Files touched

- `Makefile` (deleted)
- `install.sh` (section 10 rewritten, component title/desc/summary updated)
- `README.md` (install block + component table)
- `.claude/memory/session_2026-04-28_ampersand-shortcut.md` (this file)
- `.claude/memory/MEMORY.md` (index entry)
