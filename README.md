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

- Symlinks all config files into their expected locations (`~/.claude/`, Ghostty's Application Support dir, `~/.config/cmux/`)
- Backs up any existing files before overwriting (stored in `.backups/`)
- Clones the [ghostty-shaders](https://github.com/0xhckr/ghostty-shaders) repo into `~/Documents/Github/ghostty-shaders`
- Rewrites the Ghostty shader path to match the current machine's home directory
- Is idempotent - safe to run repeatedly

## Manual steps after install

1. **Install Claude Code** if not already present: `npm install -g @anthropic-ai/claude-code`
2. **Install plugins** from the Claude Code marketplace. The `settings.json` references several plugins that need to be installed separately via `claude /plugins`.
3. **Install the PolySans Neutral Mono font family** (used by the Ghostty config).
4. **Restart Ghostty and cmux** to pick up the new config.

## How it works

Everything is symlinked, not copied. The repo is the single source of truth. Editing `~/.claude/CLAUDE.md` on any machine edits the repo file directly. Commit and push to propagate changes across machines.

## Requirements

- macOS (paths are macOS-specific)
- `git`, `bash`, `python3`
- Ghostty terminal (optional - skip if not using)
- cmux (optional - skip if not using)
