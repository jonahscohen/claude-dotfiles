---
name: Fold discord-chat-launcher.sh into dotfiles
description: Moved ~/.claude/discord-chat-launcher.sh into claude-dotfiles/claude/, symlinked back, added install.sh wiring so it symlinks on fresh machines
type: project
---

Moved `~/.claude/discord-chat-launcher.sh` into `claude-dotfiles/claude/discord-chat-launcher.sh`, symlinked back to `~/.claude/discord-chat-launcher.sh`, and added the two install.sh lines (`make_symlink` + `chmod +x`) that the convention requires.

## Why this shape, not a generic loop

Considered refactoring install.sh to loop over `claude/*.sh` at root (would auto-wire any future top-level script). Rejected per user preference for conservative changes: the equivalence claim "refactor is semantically identical to the existing explicit lines" is the exact pattern that ships subtle bugs. Explicit `make_symlink` + `chmod +x` per file, one pair per script, matches existing style and stays minimal-scope.

## How to add future top-level claude/*.sh scripts

For each new script at `claude-dotfiles/claude/<name>.sh`:
1. Add `make_symlink "$REPO_DIR/claude/<name>.sh" "$CLAUDE_DIR/<name>.sh"` to the Claude Code section of install.sh
2. Add `chmod +x "$REPO_DIR/claude/<name>.sh"` to the chmod block at end of Claude Code section
3. Move the real file into `claude-dotfiles/claude/`, symlink back, commit.

Hook scripts (`claude/hooks/*.sh`) and memory files (`claude/memory/*.md`) DO use generic loops, added earlier. Top-level scripts stay explicit.

## Files touched

- `claude/discord-chat-launcher.sh` (new, moved from ~/.claude/)
- `~/.claude/discord-chat-launcher.sh` (now a symlink into dotfiles)
- `install.sh` (added make_symlink + chmod +x lines for the launcher)
