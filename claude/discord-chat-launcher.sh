#!/usr/bin/env zsh
# Discord Chat Agent launcher wrapper for Claude Code
# Kills stale Discord plugin processes, then launches Claude with the
# Discord channel connected.
# Source this in .zshrc: source ~/.claude/discord-chat-launcher.sh

function claude() {
  local connect
  printf "Connect to Discord Chat Agent? (y/n) "
  read -t 5 connect
  connect="${connect:-Y}"

  if [[ "$connect" =~ ^[Nn]$ ]]; then
    command claude "$@"
  else
    # Kill stale Discord plugin processes so new session owns the gateway
    local stale_pids
    stale_pids=($(pgrep -f "plugins/.*discord.*start" 2>/dev/null))
    if (( ${#stale_pids[@]} > 0 )); then
      kill "${stale_pids[@]}" 2>/dev/null
      printf "Cleared %d stale Discord Chat Agent process(es).\n" "${#stale_pids[@]}"
    fi
    command claude --channels plugin:discord@claude-plugins-official "$@"
  fi
}
