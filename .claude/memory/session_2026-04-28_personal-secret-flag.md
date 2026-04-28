---
name: Hide ghostty/shaders/discord behind a secret --personal flag
description: Public TUI now ships seven components (claude, memory, skills, statusline, cmux, nvm, ampersand). The three Jonah-only components (ghostty, shaders, discord) live in a parallel PERSONAL_KEYS array that gets merged into KEYS only when the maintainer passes the --personal flag. Flag is hidden from --help and from the README on purpose. Apply blocks stayed put so Jonah can still sync those across his own machines via `ampersand --personal`.
type: project
---

Collaborator: Jonah Cohen

# What changed

## install.sh

- Split the component arrays. `KEYS/TITLES/DESCS/PICKS` now hold the seven public components only: `claude`, `memory`, `skills`, `statusline`, `cmux`, `nvm`, `ampersand`. New parallel arrays `PERSONAL_KEYS/PERSONAL_TITLES/PERSONAL_DESCS/PERSONAL_PICKS` hold `ghostty`, `shaders`, `discord` with their full descriptions.
- Added a pre-pass that scans for `--personal` BEFORE `--only`/`--preset` flag parsing runs. If found, the personal arrays append onto KEYS/TITLES/DESCS/PICKS so the rest of the installer treats them as first-class components for that run.
- Added `--personal) shift ;;` to the main flag parser so the second pass swallows the flag without erroring on it.
- All existing apply blocks for ghostty/shaders/discord (sections 5, 6, 8) stayed put. They're guarded by `if picked X`. Picks for those keys can only be set when --personal is in effect.
- `--help` text: deliberately doesn't mention `--personal`. The valid-keys list shows only the public seven.

## bootstrap.sh

No change needed. `--personal` falls through into INSTALLER_ARGS like any other flag, gets forwarded to `install.sh` after the shortcut install. So `curl ... | bash -s -- --personal --yes` works for the maintainer.

## README

Stripped ghostty/shaders/discord from:
- High-level component table (10 rows -> 7 rows; "Ten components" -> "Seven components")
- Deep-dive component table
- Customization section's valid-keys list
- Architecture symlink table (Ghostty row removed)
- Troubleshooting section (Ghostty shaders, Discord wrapper entries removed)
- Architecture .zshrc-appends bullet (was "discord, nvm, shortcuts" -> "nvm, shortcuts")
- Contributing example list (was "discord, nvm, ampersand" -> "nvm, ampersand")

Left intact:
- The `discord@claude-plugins-official` row in the plugins table - that's a Claude Code plugin, independent of the personal shell-wrapper component, and useful to anyone who pairs Claude with Discord
- The `ghostty-shaders` library credit in the License section - it's a real dependency that Jonah's machine pulls via `--personal`

# Usage (maintainer reference)

```bash
# Public install on Jonah's own machine (gets only the 7 public components):
ampersand

# Personal install on Jonah's own machine (adds ghostty, shaders, discord):
ampersand --personal

# Specific personal component:
ampersand --personal --only ghostty,shaders

# Curl-bootstrap on a fresh personal Mac (full personal install):
curl -fsSL https://raw.githubusercontent.com/jonahscohen/claude-dotfiles/main/bootstrap.sh | bash -s -- --personal --yes
```

For convenience on Jonah's own machines, add to ~/.zshrc (NOT shipped via dotfiles):
```zsh
alias mine='ampersand --personal'
```

Then `mine` runs the full personal install, `mine --pull` syncs and runs.

# Why the flag is hidden

The three personal components (ghostty terminal look, shaders, discord shell wrapper) reflect Jonah's specific setup, not Yes& engineering defaults. Public users curl-bootstrapping the repo should not see them in the TUI, --help, or README. Anyone snooping the install.sh source can find the flag, but: (1) the mechanism is intentionally undocumented, not security-by-obscurity for secrets, just brand/scope hygiene; (2) running `--personal` on someone else's machine just installs three additional benign config files - no secret data leaks because there is none.

# Files touched

- `install.sh` (component split, --personal flag, --help update)
- `README.md` (stripped personal components from public-facing tables and troubleshooting)
- `.claude/memory/session_2026-04-28_personal-secret-flag.md` (this file)
- `.claude/memory/MEMORY.md` (index entry)
