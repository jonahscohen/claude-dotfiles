---
name: Transfer claude-dotfiles from raiderforge to jonahscohen
description: Transferred the GitHub repo from raiderforge/claude-dotfiles to jonahscohen/claude-dotfiles (the user's personal account). Updated the two hardcoded URLs (bootstrap.sh + README.md) and reset the local origin remote.
type: project
---

Collaborator: Jonah Cohen

# What changed

- GitHub repo transferred from `raiderforge/claude-dotfiles` to `jonahscohen/claude-dotfiles` via the GitHub web UI's Danger Zone. Transfer is irreversible without another transfer; GitHub auto-redirects from the old URL for ~6 months.
- `bootstrap.sh` line 20: REPO_URL default changed from `https://github.com/raiderforge/claude-dotfiles.git` to `https://github.com/jonahscohen/claude-dotfiles.git`. The `CLAUDE_DOTFILES_REPO` env var still overrides if set.
- `README.md` line 55 (the curl one-liner): `raw.githubusercontent.com/raiderforge/...` -> `raw.githubusercontent.com/jonahscohen/...`. Raw content does NOT redirect after a transfer, so this update is necessary; the old raw URL would have started 404'ing.
- Local `origin` remote reset: `git remote set-url origin git@github.com:jonahscohen/claude-dotfiles.git`. Fetch verified as working post-change.

# Why

User wanted the project under their personal namespace rather than the raiderforge org.

# Effects on existing users

- `git pull`: works via GitHub's transparent redirect for old remotes. Updating the local remote is good hygiene but not urgent.
- `yesplease` and `ampersand`: unchanged - they `cd` to the local repo path and run `git pull` against whatever the local origin is set to. Other machines that have the dotfiles cloned will redirect on first pull.
- The curl one-liner: needs the new URL. Old URL will 404 immediately.
- bootstrap.sh's clone-fresh path: uses the REPO_URL constant. New clones get the canonical jonahscohen URL.

# Files touched

- `bootstrap.sh`
- `README.md`
- `.git/config` (origin remote URL)
- `.claude/memory/session_2026-04-28_repo-transfer.md` (this file)
- `.claude/memory/MEMORY.md` (index entry)
