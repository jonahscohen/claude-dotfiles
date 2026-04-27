#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# claude-dotfiles bootstrap
# Tiny entrypoint for `curl -fsSL <url>/bootstrap.sh | bash`.
# Clones (or updates) the repo, then re-execs install.sh with a TTY
# restored so the interactive checkbox TUI works through curl|bash.
#
# Pass-through flags work too:
#   curl -fsSL .../bootstrap.sh | bash -s -- --yes
#   curl -fsSL .../bootstrap.sh | bash -s -- --preset minimal
#
# Choose where the repo lives on this machine (3 options, any one works):
#   1. Set env var:  CLAUDE_DOTFILES_DIR=~/code/dots curl ... | bash
#   2. Pass --dir:   curl ... | bash -s -- --dir ~/code/dots
#   3. Default:      ~/Documents/Github/claude-dotfiles
# ============================================================

REPO_URL="${CLAUDE_DOTFILES_REPO:-https://github.com/raiderforge/claude-dotfiles.git}"
REPO_DIR="${CLAUDE_DOTFILES_DIR:-$HOME/Documents/Github/claude-dotfiles}"

# Peel off --dir PATH if present at the front; leave everything else for install.sh.
INSTALLER_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)
      REPO_DIR="$2"
      shift 2
      ;;
    --dir=*)
      REPO_DIR="${1#--dir=}"
      shift
      ;;
    *)
      INSTALLER_ARGS+=("$1")
      shift
      ;;
  esac
done
# Expand leading ~ if user passed --dir ~/code/dots literally
case "$REPO_DIR" in
  "~"|"~/"*) REPO_DIR="${HOME}${REPO_DIR#\~}" ;;
esac

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { printf "${CYAN}[bootstrap]${NC} %s\n" "$1"; }
ok()   { printf "${GREEN}[bootstrap]${NC} %s\n" "$1"; }
warn() { printf "${YELLOW}[bootstrap]${NC} %s\n" "$1"; }
err()  { printf "${RED}[bootstrap]${NC} %s\n" "$1"; }

if [[ "$(uname)" != "Darwin" ]]; then
  err "claude-dotfiles is macOS-only."
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  err "git is required but not installed. Install Xcode Command Line Tools first:"
  err "  xcode-select --install"
  exit 1
fi

if [ -d "$REPO_DIR/.git" ]; then
  ok "$REPO_DIR exists - pulling latest"
  git -C "$REPO_DIR" pull --ff-only 2>/dev/null \
    || warn "Pull failed (local changes?). Continuing with current checkout."
elif [ -d "$REPO_DIR" ]; then
  err "$REPO_DIR exists but is not a git repo. Move or remove it and re-run."
  exit 1
else
  info "Cloning $REPO_URL into $REPO_DIR"
  mkdir -p "$(dirname "$REPO_DIR")"
  git clone "$REPO_URL" "$REPO_DIR"
fi

cd "$REPO_DIR"
chmod +x install.sh 2>/dev/null || true

# When piped from curl, stdin is the bootstrap script body, not a TTY. The
# installer's TUI reads from stdin, so we re-exec with /dev/tty as stdin if
# available. If neither stdin is a TTY nor /dev/tty is readable (e.g. CI),
# fall back to --yes so we at least install everything non-interactively.
if [ -t 0 ] && [ -t 1 ]; then
  exec bash install.sh "${INSTALLER_ARGS[@]+"${INSTALLER_ARGS[@]}"}"
elif [ -r /dev/tty ]; then
  exec bash install.sh "${INSTALLER_ARGS[@]+"${INSTALLER_ARGS[@]}"}" </dev/tty
else
  warn "No TTY detected. Running install.sh --yes (full install)."
  exec bash install.sh --yes "${INSTALLER_ARGS[@]+"${INSTALLER_ARGS[@]}"}"
fi
