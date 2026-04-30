#!/usr/bin/env zsh
# Discord Chat Agent launcher wrapper for Claude Code.
#
# Sourced from ~/.zshrc by the dotfiles installer. Overrides the `claude`
# command so a session-start prompt picks the right behavior based on what's
# already set up on this machine. Three states:
#
#   COLD - no bot token in Keychain. Offer to onboard, skip, or never-ask.
#   MID  - token in Keychain but no users paired. Offer pair-now or skip.
#   WARM - token + at least one paired user. The familiar 5s connect prompt.
#
# A user who never wants this prompt can opt out forever by creating
# ~/.claude/channels/discord/.skip-launcher (the launcher checks for it first
# and falls through to plain `claude` immediately).
#
# Source this in .zshrc:  source ~/.claude/discord-chat-launcher.sh

SERVICE="claude-discord-bot"
ACCOUNT="$USER"
STATE_DIR="$HOME/.claude/channels/discord"
ACCESS_FILE="$STATE_DIR/access.json"
SKIP_FILE="$STATE_DIR/.skip-launcher"
ONBOARD_SCRIPT="$HOME/.claude/discord-onboard.sh"

function _claude_has_discord_token() {
  security find-generic-password -s "$SERVICE" -a "$ACCOUNT" -w >/dev/null 2>&1
}

function _claude_has_discord_pair() {
  [ -f "$ACCESS_FILE" ] || return 1
  if command -v jq >/dev/null 2>&1; then
    [ "$(jq -r '.allowFrom | length' "$ACCESS_FILE" 2>/dev/null || echo 0)" -gt 0 ]
  else
    grep -Eq '"allowFrom"[[:space:]]*:[[:space:]]*\[[[:space:]]*"' "$ACCESS_FILE"
  fi
}

function _claude_kill_stale_discord() {
  local stale_pids
  stale_pids=($(pgrep -f "plugins/.*discord.*start" 2>/dev/null))
  if (( ${#stale_pids[@]} > 0 )); then
    kill "${stale_pids[@]}" 2>/dev/null
    printf "Cleared %d stale Discord Chat Agent process(es).\n" "${#stale_pids[@]}"
  fi
}

function _claude_run_with_discord() {
  _claude_kill_stale_discord
  command claude --channels plugin:discord@claude-plugins-official "$@"
}

function claude() {
  # Hard opt-out: marker file means "stop asking, just run claude".
  if [ -f "$SKIP_FILE" ]; then
    command claude "$@"
    return $?
  fi

  if _claude_has_discord_token; then
    if _claude_has_discord_pair; then
      # WARM. Same UX as before: 5s prompt, default Y, connect with channel.
      local connect
      printf "Connect to Discord Chat Agent? (y/n) "
      read -t 5 connect
      connect="${connect:-Y}"
      if [[ "$connect" =~ ^[Nn]$ ]]; then
        command claude "$@"
      else
        _claude_run_with_discord "$@"
      fi
    else
      # MID. Bot configured, no users paired.
      printf "Discord bot is configured but no one has paired yet.\n"
      printf "  [p] Pair now (start session with channel attached, then DM the bot)\n"
      printf "  [s] Skip Discord this session\n"
      printf "Choice [p/s] (default s): "
      local choice
      read -t 10 choice
      choice="${choice:-s}"
      case "$choice" in
        [Pp]*) _claude_run_with_discord "$@" ;;
        *)     command claude "$@" ;;
      esac
    fi
  else
    # COLD. No token in Keychain.
    printf "Discord Chat Agent isn't set up on this machine.\n"
    printf "  [s] Set up now (interactive walkthrough)\n"
    printf "  [k] Skip this session, ask again next time\n"
    printf "  [n] Never ask on this machine\n"
    printf "Choice [s/k/n] (default k): "
    local choice
    read -t 10 choice
    choice="${choice:-k}"
    case "$choice" in
      [Ss]*)
        if [ -x "$ONBOARD_SCRIPT" ]; then
          "$ONBOARD_SCRIPT"
        else
          printf "Onboard script missing. Run: ampersand --only claude\n" >&2
        fi
        # After onboard returns we don't auto-launch claude - the user almost
        # always wants to inspect the result first. They can run 'claude'
        # again themselves.
        return 0
        ;;
      [Nn]*)
        mkdir -p "$STATE_DIR"
        : > "$SKIP_FILE"
        printf "Got it. Created %s - this prompt won't appear again.\n" "$SKIP_FILE"
        printf "(Delete that file to re-enable.)\n"
        command claude "$@"
        ;;
      *)
        command claude "$@"
        ;;
    esac
  fi
}
