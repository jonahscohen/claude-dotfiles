# claude-dotfiles

Portable configuration for Claude Code, Ghostty, and cmux. One script to replicate the full setup on a new Mac.

## What's included

| Directory | Contents |
|-----------|----------|
| `claude/` | Global `CLAUDE.md` instructions, `settings.json` (hooks, statusline, plugins, env), startup hook, statusline script, memory files |
| `ghostty/` | Ghostty terminal config (PolySans Neutral Mono, custom 256-color palette, transparency, blur, cursor_blaze shader) |
| `cmux/` | cmux settings |
| `shaders/` | Bundled copy of `cursor_blaze.glsl` as a backup |

## Install

```bash
git clone <this-repo> ~/Documents/Github/claude-dotfiles
cd ~/Documents/Github/claude-dotfiles
./install.sh
```

The installer:

- Symlinks Claude Code config files and cmux settings into their expected locations (`~/.claude/`, `~/.config/cmux/`)
- **Copies** the Ghostty config into its Application Support dir and substitutes the `__GHOSTTY_SHADERS_DIR__` placeholder with this machine's shaders path (copy-not-symlink so the repo file never holds a machine-specific path)
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

**Claude Code, cmux:** symlinked. Editing `~/.claude/CLAUDE.md` on any machine edits the repo file directly. Commit and push to propagate changes across machines.

**Ghostty:** copied, not symlinked, because the shader path is per-machine. The repo file contains a `__GHOSTTY_SHADERS_DIR__` placeholder; the installer substitutes it on each machine. To propagate edits to the Ghostty config, re-run `install.sh` after pulling.

**discord-chat-launcher.sh:** symlinked into `~/.claude/`, AND the installer wires a source line into `~/.zshrc` (marker-guarded). The file alone is inert until sourced; the wrapper needs to be loaded by your interactive shell.

## Requirements

- macOS (paths are macOS-specific)
- `git`, `bash`, `python3`
- Ghostty terminal (optional - skip if not using)
- cmux (optional - skip if not using)
