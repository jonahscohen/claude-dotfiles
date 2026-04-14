---
name: Discord channel made portable across machines
description: Migrated Discord bot config to Keychain + dotfiles so a new machine only needs a one-shot setup to join the same bot/allowlist
type: project
---

## Changes

- Token moved to macOS Keychain (service `claude-discord-bot`, account `$USER`). Source of truth per machine.
- `access.json` moved to `claude-dotfiles/claude/channels/discord/access.json`, symlinked from `~/.claude/channels/discord/access.json`. Allowlist now syncs with the dotfiles repo.
- `.env` stays local per machine, regenerated from Keychain by the setup script. Kept because plugin-spawned MCP servers don't inherit env (server.ts:42-51).
- Added `claude-dotfiles/claude/discord-setup.sh`: one-shot per-machine installer. Idempotent; supports `--rotate` to replace the token, or a positional arg for non-interactive install.

## New machine workflow

1. Clone `claude-dotfiles` and run its `install.sh` as usual.
2. Run `~/Documents/Github/claude-dotfiles/claude/discord-setup.sh`.
3. Paste the bot token when prompted (only needed if Keychain on this machine doesn't already have it).
4. `/reload-plugins` in Claude.

## Key decisions

- **Keychain over iCloud symlink**: user chose Keychain. Tradeoff: per-machine token install, but the secret never leaves the local login keychain.
- **Do not sync `.env` via dotfiles**: would put the token in the repo. Regenerate from Keychain instead.
- **Do not sync `inbox/` or `approved/`**: per-machine runtime state, not config.

## Files touched

- `/Users/spare3/Documents/Github/claude-dotfiles/claude/discord-setup.sh` (new)
- `/Users/spare3/Documents/Github/claude-dotfiles/claude/channels/discord/access.json` (moved here)
- `~/.claude/channels/discord/access.json` (now a symlink)
- `~/.claude/channels/discord/.env` (regenerated from Keychain)
- macOS Keychain entry added: service `claude-discord-bot`, account `$USER`
