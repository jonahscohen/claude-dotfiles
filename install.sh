#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# claude-dotfiles installer
# Symlinks Claude Code config, Ghostty config, cmux config,
# and clones ghostty-shaders into their expected locations.
# Idempotent - safe to run multiple times.
# ============================================================

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$REPO_DIR/.backups/$(date +%Y%m%d-%H%M%S)"
BACKED_UP=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { printf "${CYAN}[info]${NC}  %s\n" "$1"; }
ok()    { printf "${GREEN}[ok]${NC}    %s\n" "$1"; }
warn()  { printf "${YELLOW}[warn]${NC}  %s\n" "$1"; }
err()   { printf "${RED}[error]${NC} %s\n" "$1"; }

# ============================================================
# Helpers
# ============================================================

backup_if_exists() {
  local target="$1"
  if [ -e "$target" ] && [ ! -L "$target" ]; then
    mkdir -p "$BACKUP_DIR"
    local rel="${target#$HOME/}"
    local backup_path="$BACKUP_DIR/$rel"
    mkdir -p "$(dirname "$backup_path")"
    cp -a "$target" "$backup_path"
    BACKED_UP=1
    warn "Backed up $target"
  fi
}

make_symlink() {
  local source="$1"
  local target="$2"

  # Already correct
  if [ -L "$target" ] && [ "$(readlink "$target")" = "$source" ]; then
    ok "$target (already linked)"
    return
  fi

  # Back up existing file (not symlink)
  backup_if_exists "$target"

  # Remove stale symlink or file
  if [ -e "$target" ] || [ -L "$target" ]; then
    rm "$target"
  fi

  mkdir -p "$(dirname "$target")"
  ln -s "$source" "$target"
  ok "$target -> $source"
}

# ============================================================
# Pre-flight
# ============================================================

if [[ "$(uname)" != "Darwin" ]]; then
  err "This installer is built for macOS. Linux support would need different paths."
  err "Ghostty config: ~/.config/ghostty/config instead of ~/Library/Application Support/"
  err "Adapt the GHOSTTY_CONFIG_DIR variable below and re-run."
  exit 1
fi

# Detect home directory for path rewriting
USER_HOME="$HOME"

# ============================================================
# 1. Claude Code config
# ============================================================

echo ""
info "--- Claude Code ---"

CLAUDE_DIR="$HOME/.claude"
mkdir -p "$CLAUDE_DIR/memory"
mkdir -p "$CLAUDE_DIR/hooks"

make_symlink "$REPO_DIR/claude/CLAUDE.md"           "$CLAUDE_DIR/CLAUDE.md"
make_symlink "$REPO_DIR/claude/settings.json"        "$CLAUDE_DIR/settings.json"
make_symlink "$REPO_DIR/claude/startup-check.sh"     "$CLAUDE_DIR/startup-check.sh"
make_symlink "$REPO_DIR/claude/statusline-command.sh" "$CLAUDE_DIR/statusline-command.sh"
make_symlink "$REPO_DIR/claude/discord-chat-launcher.sh" "$CLAUDE_DIR/discord-chat-launcher.sh"

# Symlink every memory file from the repo (sessions, feedback, references, MEMORY.md)
for f in "$REPO_DIR"/claude/memory/*.md; do
  [ -f "$f" ] || continue
  make_symlink "$f" "$CLAUDE_DIR/memory/$(basename "$f")"
done

# Symlink every hook script from the repo
for f in "$REPO_DIR"/claude/hooks/*.sh; do
  [ -f "$f" ] || continue
  make_symlink "$f" "$CLAUDE_DIR/hooks/$(basename "$f")"
  chmod +x "$f"
done

chmod +x "$REPO_DIR/claude/startup-check.sh"
chmod +x "$REPO_DIR/claude/statusline-command.sh"
chmod +x "$REPO_DIR/claude/discord-chat-launcher.sh"

# ============================================================
# 2. Ghostty shaders repo
# ============================================================

echo ""
info "--- Ghostty Shaders ---"

SHADERS_DIR="$HOME/Documents/Github/ghostty-shaders"

if [ -d "$SHADERS_DIR/.git" ]; then
  ok "$SHADERS_DIR (already cloned)"
  info "Pulling latest..."
  git -C "$SHADERS_DIR" pull --ff-only 2>/dev/null || warn "Pull failed - may have local changes. Skipping."
elif [ -d "$SHADERS_DIR" ]; then
  warn "$SHADERS_DIR exists but is not a git repo. Skipping clone."
else
  info "Cloning ghostty-shaders..."
  mkdir -p "$(dirname "$SHADERS_DIR")"
  git clone https://github.com/0xhckr/ghostty-shaders.git "$SHADERS_DIR"
  ok "Cloned ghostty-shaders"
fi

# cursor_blaze.glsl now lives in this repo at shaders/cursor_blaze.glsl and is
# loaded from there directly by Ghostty (see config substitution below). The
# ghostty-shaders clone is kept for the rest of the community shader library.

# ============================================================
# 3. Ghostty config
# ============================================================

echo ""
info "--- Ghostty ---"

GHOSTTY_CONFIG_DIR="$HOME/Library/Application Support/com.mitchellh.ghostty"
mkdir -p "$GHOSTTY_CONFIG_DIR"

GHOSTTY_SOURCE="$REPO_DIR/ghostty/config.ghostty"
GHOSTTY_TARGET="$GHOSTTY_CONFIG_DIR/config.ghostty"

# Ghostty config is COPIED (not symlinked) because the shader path is per-machine.
# The repo file contains a __DOTFILES_DIR__ placeholder; install substitutes it
# here so the repo file stays clean across machines.
backup_if_exists "$GHOSTTY_TARGET"
if [ -L "$GHOSTTY_TARGET" ]; then
  rm "$GHOSTTY_TARGET"
fi
cp "$GHOSTTY_SOURCE" "$GHOSTTY_TARGET"
sed -i '' "s|__DOTFILES_DIR__|$REPO_DIR|g" "$GHOSTTY_TARGET"
ok "$GHOSTTY_TARGET (copied, shader path -> $REPO_DIR/shaders)"

# ============================================================
# 4. cmux config
# ============================================================

echo ""
info "--- cmux ---"

CMUX_CONFIG_DIR="$HOME/.config/cmux"
mkdir -p "$CMUX_CONFIG_DIR"

make_symlink "$REPO_DIR/cmux/settings.json" "$CMUX_CONFIG_DIR/settings.json"

# ============================================================
# 5. Discord Chat Agent launcher (zsh only, idempotent)
# ============================================================
# discord-chat-launcher.sh defines a zsh function that shadows `claude` to
# optionally connect Discord on startup. Symlinking the file doesn't activate
# it; the user's .zshrc must source it. Append that source line once, guarded
# by a marker comment so re-runs don't duplicate.

echo ""
info "--- Discord Chat Agent launcher ---"

ZSHRC="$HOME/.zshrc"
DISCORD_LINE="source $CLAUDE_DIR/discord-chat-launcher.sh  # claude-dotfiles: discord-chat-launcher"

if [ -f "$ZSHRC" ]; then
  # Detect ANY existing source of discord-chat-launcher.sh (manually added or
  # marker-guarded from a prior run). Prevents duplicate appends.
  if grep -Fq "discord-chat-launcher.sh" "$ZSHRC"; then
    ok "$ZSHRC (already sources discord-chat-launcher.sh)"
  else
    printf '\n# Discord Chat Agent launcher (from claude-dotfiles)\n%s\n' "$DISCORD_LINE" >> "$ZSHRC"
    ok "Appended discord-chat-launcher source line to $ZSHRC"
    warn "Run 'source $ZSHRC' or open a new shell to pick up the wrapper."
  fi
else
  warn "$ZSHRC not found - skipping discord-chat-launcher source line (zsh only)."
fi

# ============================================================
# Summary
# ============================================================

echo ""
echo "============================================"
printf "${GREEN}Installation complete.${NC}\n"
echo "============================================"
echo ""

if [ "$BACKED_UP" -eq 1 ]; then
  warn "Backups saved to: $BACKUP_DIR"
  echo ""
fi

echo "What was installed:"
echo "  - Claude Code: CLAUDE.md, settings.json, hooks, statusline, memory, discord-chat-launcher"
echo "  - Ghostty: config.ghostty (COPIED, shader placeholder substituted for this machine)"
echo "  - Ghostty cursor shader: $REPO_DIR/shaders/cursor_blaze.glsl (loaded in-place, edits sync live)"
echo "  - cmux: settings.json"
echo "  - Ghostty shaders library: cloned/updated in $SHADERS_DIR"
echo "  - .zshrc: source line for discord-chat-launcher (added once, marker-guarded)"
echo ""
echo "Manual steps remaining:"
echo "  1. Install Claude Code if not already present:"
echo "     npm install -g @anthropic-ai/claude-code"
echo "  2. Install plugins from the Claude Code marketplace."
echo "     Your settings.json enables these plugins - install them via:"
echo "     claude /plugins"
echo "  3. Install the PolySans Neutral Mono font family (used by Ghostty config)."
echo "  4. Restart Ghostty and cmux to pick up config changes."
echo "  5. Open a new shell or 'source ~/.zshrc' to activate the discord-chat-launcher wrapper."
echo ""
