#!/usr/bin/env zsh
# Per-machine Discord bot setup for Claude Code.
#
# Run once per machine. Pulls the bot token from macOS Keychain
# (service: claude-discord-bot, account: $USER) and writes it to
# ~/.claude/channels/discord/.env with 600 perms.
#
# If the token is not yet in Keychain on this machine, prompts for it
# and stores it. The access.json allowlist is synced via dotfiles and
# needs no per-machine action.
#
# Usage:
#   ./discord-setup.sh           # interactive
#   ./discord-setup.sh <token>   # non-interactive, store given token
#   ./discord-setup.sh --rotate  # force re-prompt even if Keychain has one

set -euo pipefail

SERVICE="claude-discord-bot"
ACCOUNT="$USER"
STATE_DIR="$HOME/.claude/channels/discord"
ENV_FILE="$STATE_DIR/.env"
DOTFILES_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]:-$0}")" && pwd)"
SHARED_ACCESS="$DOTFILES_DIR/channels/discord/access.json"
LOCAL_ACCESS="$STATE_DIR/access.json"

mode="default"
token_arg=""
for arg in "$@"; do
  case "$arg" in
    --rotate) mode="rotate" ;;
    --help|-h)
      sed -n '2,18p' "$0"
      exit 0 ;;
    *) token_arg="$arg" ;;
  esac
done

mkdir -p "$STATE_DIR"

# 1. Token: Keychain is source of truth per machine.
if [[ -n "$token_arg" ]]; then
  security add-generic-password -s "$SERVICE" -a "$ACCOUNT" -w "$token_arg" -U
  printf "Token stored in Keychain.\n"
elif [[ "$mode" == "rotate" ]] || ! security find-generic-password -s "$SERVICE" -a "$ACCOUNT" -w >/dev/null 2>&1; then
  printf "Discord bot token (Developer Portal -> Bot -> Reset Token): "
  read -r -s token
  printf "\n"
  if [[ -z "$token" ]]; then
    printf "No token given, aborting.\n" >&2
    exit 1
  fi
  security add-generic-password -s "$SERVICE" -a "$ACCOUNT" -w "$token" -U
  printf "Token stored in Keychain.\n"
else
  printf "Token already in Keychain (use --rotate to replace).\n"
fi

# 2. Regenerate .env from Keychain each run. Plugin-spawned MCP servers
#    don't inherit env, so the file is mandatory.
TOKEN=$(security find-generic-password -s "$SERVICE" -a "$ACCOUNT" -w)
umask 077
printf "DISCORD_BOT_TOKEN=%s\n" "$TOKEN" > "$ENV_FILE"
chmod 600 "$ENV_FILE"
printf "Wrote %s (chmod 600).\n" "$ENV_FILE"

# 3. Symlink access.json from the dotfiles repo so allowlist changes
#    sync across machines.
if [[ -e "$LOCAL_ACCESS" && ! -L "$LOCAL_ACCESS" ]]; then
  if [[ -s "$SHARED_ACCESS" ]]; then
    printf "Local access.json exists and shared copy is present. Backing up local to access.json.bak.\n"
    mv "$LOCAL_ACCESS" "$LOCAL_ACCESS.bak"
  else
    printf "Promoting local access.json to shared dotfiles location.\n"
    mkdir -p "$(dirname "$SHARED_ACCESS")"
    mv "$LOCAL_ACCESS" "$SHARED_ACCESS"
  fi
fi

if [[ ! -L "$LOCAL_ACCESS" ]]; then
  if [[ ! -e "$SHARED_ACCESS" ]]; then
    mkdir -p "$(dirname "$SHARED_ACCESS")"
    printf '{"dmPolicy":"pairing","allowFrom":[],"groups":{},"pending":{}}\n' > "$SHARED_ACCESS"
    printf "Created empty shared access.json.\n"
  fi
  ln -s "$SHARED_ACCESS" "$LOCAL_ACCESS"
  printf "Symlinked %s -> %s\n" "$LOCAL_ACCESS" "$SHARED_ACCESS"
fi

printf "\nDone. Run /reload-plugins in Claude to reboot the Discord server.\n"
