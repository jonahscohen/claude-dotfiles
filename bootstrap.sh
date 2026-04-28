#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# claude-dotfiles bootstrap
# Tiny entrypoint for `curl -fsSL <url>/bootstrap.sh | bash`.
#
# DEFAULT BEHAVIOR (no args): clones the repo, installs ONLY the 'ampersand'
# shell shortcut, prints "Unpacking installer...complete. Type 'ampersand'
# to begin." and exits. The user then opens a new shell (or sources .zshrc)
# and types 'ampersand' to launch the full TUI.
#
# WITH ARGS: passes them through to install.sh after the shortcut install.
#   curl -fsSL .../bootstrap.sh | bash -s -- --yes
#   curl -fsSL .../bootstrap.sh | bash -s -- --preset minimal
#
# Choose where the repo lives on this machine (3 options, any one works):
#   1. Set env var:  CLAUDE_DOTFILES_DIR=~/code/dots curl ... | bash
#   2. Pass --dir:   curl ... | bash -s -- --dir ~/code/dots
#   3. Default:      ~/Documents/Github/claude-dotfiles
# ============================================================

REPO_URL="${CLAUDE_DOTFILES_REPO:-https://github.com/jonahscohen/claude-dotfiles.git}"
REPO_DIR="${CLAUDE_DOTFILES_DIR:-$HOME/Documents/Github/claude-dotfiles}"

# Peel off --dir PATH if present; leave everything else for install.sh.
HAS_INSTALLER_ARGS=0
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
      HAS_INSTALLER_ARGS=1
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
PURPLE='\033[38;2;124;58;237m'
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

# ============================================================
# Step 1: Clone or pull the repo
# ============================================================

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

# ============================================================
# Step 2: Always install the 'ampersand' shortcut (silent + fast)
# ============================================================

printf "Unpacking installer..."
if bash install.sh --only ampersand --yes >/dev/null 2>&1; then
  printf "complete.\n"
else
  printf "failed.\n"
  err "Could not install the ampersand shortcut. Run this for diagnostics:"
  err "  cd $REPO_DIR && bash install.sh --only ampersand --yes"
  exit 1
fi

# ============================================================
# Step 3: Either run the full installer (if args were passed)
# or print the welcome and exit (if no args)
# ============================================================

if [ "$HAS_INSTALLER_ARGS" -eq 1 ]; then
  # User passed installer flags through curl|bash. Re-exec with the args
  # and a TTY restored so the TUI works through the pipe if needed.
  if [ -t 0 ] && [ -t 1 ]; then
    exec bash install.sh "${INSTALLER_ARGS[@]+"${INSTALLER_ARGS[@]}"}"
  elif [ -r /dev/tty ]; then
    exec bash install.sh "${INSTALLER_ARGS[@]+"${INSTALLER_ARGS[@]}"}" </dev/tty
  else
    exec bash install.sh --yes "${INSTALLER_ARGS[@]+"${INSTALLER_ARGS[@]}"}"
  fi
else
  # No args - just installed the shortcut. Tell the user what to do next.
  printf "\n"
  printf "${PURPLE}Type 'ampersand' to begin.${NC}\n"
  printf "  (Open a new terminal first, or run 'source ~/.zshrc' in this one.)\n"
  printf "\n"
fi
