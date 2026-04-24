# claude-dotfiles

Portable configuration for Claude Code, Ghostty, and cmux. One script to replicate the full setup on a new Mac.

## What's included

| Directory | Contents |
|-----------|----------|
| `claude/` | Global `CLAUDE.md` instructions, `settings.json` (hooks, statusline, plugins, env), startup hook, statusline script, memory files |
| `ghostty/` | Ghostty terminal config (PolySans Neutral Mono, custom 256-color palette, transparency, blur, chained `bettercrt` + `tft` + `cursor_blaze` shaders) |
| `cmux/` | cmux settings |
| `shaders/` | In-repo copies of `bettercrt.glsl`, `tft.glsl`, and `cursor_blaze.glsl` - loaded directly by Ghostty so edits sync live |

## Install

```bash
git clone <this-repo> ~/Documents/Github/claude-dotfiles
cd ~/Documents/Github/claude-dotfiles
./install.sh
```

The installer:

- Symlinks Claude Code config and cmux settings into their expected locations (`~/.claude/`, `~/.config/cmux/`)
- **Copies** the Ghostty config into its Application Support dir (Ghostty silently ignores symlinks there). The repo file is byte-identical to the deployed file - the shader path uses `~` which Ghostty expands on each machine
- Warns if the repo clone is not at `~/Documents/Github/claude-dotfiles` (the Ghostty config's shader path is pinned to this location)
- Backs up any existing files before overwriting (stored in `.backups/`)
- Clones the [ghostty-shaders](https://github.com/0xhckr/ghostty-shaders) repo into `~/Documents/Github/ghostty-shaders`
- Appends a `source ~/.claude/discord-chat-launcher.sh` line to `~/.zshrc` if not already present (marker-guarded, safe to re-run)
- Is idempotent - safe to run repeatedly

## Manual steps after install

1. **Install Claude Code** if not already present: `npm install -g @anthropic-ai/claude-code`
2. **Install plugins** from the Claude Code marketplace. The `settings.json` references several plugins that need to be installed separately via `claude /plugins`.
3. **Install the PolySans Neutral Mono font family** (used by the Ghostty config).
4. **Restart Ghostty and cmux** to pick up the new config.
5. **Open a new shell** (or `source ~/.zshrc`) so the discord-chat-launcher wrapper takes effect.

## How it works

**Claude Code, cmux:** symlinked. Editing `~/.claude/CLAUDE.md` on any machine edits the repo file directly. Commit and push to propagate changes across machines; a `git pull` is the sync step on other machines.

**Ghostty:** copied (not symlinked - Ghostty silently ignores symlinks in its Application Support dir). The repo file is byte-identical to the deployed file: shader paths are `~/Documents/Github/claude-dotfiles/shaders/*.glsl` (Ghostty expands `~`), so no placeholder substitution is needed. Every machine must clone this repo at that path for the shaders to resolve; the installer warns if not. To propagate Ghostty config edits: make the change in the repo, commit, push, pull on the other machine, then re-run `./install.sh`.

**Edits on a machine directly (not via the repo)** land in `~/Library/Application Support/com.mitchellh.ghostty/config.ghostty` and will silently drift. Best practice: always edit `ghostty/config.ghostty` in the repo, then `./install.sh`.

**discord-chat-launcher.sh:** symlinked into `~/.claude/`, AND the installer wires a source line into `~/.zshrc` (marker-guarded). The file alone is inert until sourced; the wrapper needs to be loaded by your interactive shell.

## Requirements

- macOS (paths are macOS-specific)
- `git`, `bash`, `python3`
- Ghostty terminal (optional - skip if not using)
- cmux (optional - skip if not using)
