---
name: Fix claude-not-found-in-PATH via nvm default auto-activation
description: Added `nvm use default --silent` to ~/.zshrc and install.sh so the claude binary (installed under nvm-managed Node v20) is on PATH in every fresh shell. Root cause was Homebrew's nvm not auto-activating a default Node version.
type: project
---

Collaborator: Jonah Cohen

# What changed

- `~/.zshrc`: inserted `nvm use default --silent 2>/dev/null` immediately after the nvm.sh source line. Also collapsed three duplicate `export PATH="/opt/homebrew/opt/mysql-client/bin:$PATH"` lines down to one while in there.
- `install.sh`: new section 6 "nvm default auto-activation". Marker-guarded idempotent append that only fires if the user's .zshrc already sources nvm.sh. Safe to re-run.
- Backed up the pre-edit .zshrc to `.backups/zshrc-before-nvm-use-20260424-093915` before touching it.

# Why

User ran `claude` in a fresh terminal and got `Error: claude not found in PATH`. That error message comes from the cmux claude wrapper at `/Applications/cmux.app/Contents/Resources/bin/claude` (lines 87 and 92). The wrapper is first in PATH, runs when you type `claude`, and tries to find the "real" claude binary elsewhere in PATH. If it can't, it prints that exact error and exits 127.

Real binary lives at `~/.nvm/versions/node/v20.19.6/bin/claude` (installed via npm under nvm-managed Node 20). That path was NOT in PATH in fresh shells because Homebrew's nvm install sources `nvm.sh` (making the `nvm` command available) but does NOT run `nvm use default` the way the manual-install script does. So in a fresh terminal: cmux wrapper runs → looks for claude elsewhere in PATH → finds nothing → errors.

`nvm alias default` was already set to `20` (resolving to v20.19.6), so `nvm use default` was the right hook. Verified the fix with `zsh -i -c 'command claude --version'` which now returns `2.1.119 (Claude Code)` from a cold shell.

# How to apply

Install.sh's new section 6 is gated on the user's .zshrc containing `nvm.sh`. On machines that don't use nvm, nothing gets appended. On machines that already have the line, the marker grep skips re-appending.

# Files touched

- `~/.zshrc` (user's home, not in repo)
- `install.sh`
- `.backups/zshrc-before-nvm-use-20260424-093915` (backup)
- `.claude/memory/MEMORY.md` (index entry)
