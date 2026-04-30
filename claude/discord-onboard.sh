#!/usr/bin/env zsh
# Discord Chat Agent onboarding for Claude Code.
#
# Interactive walkthrough that gets a fresh machine from "nothing set up" to
# "bot configured + paired with this user" in under five minutes. Two paths:
#
#   1. "I already have a bot"      - paste the token, done.
#   2. "Walk me through a new one" - Developer Portal step-by-step.
#
# Both paths end the same way: store the token in Keychain via discord-setup.sh,
# tell the user to start a Claude session and DM the bot, and explain that the
# bot will reply with a 6-character pairing code that they then approve via
# `/discord:access pair <code>` in a Claude terminal session.
#
# Safe to re-run. Re-detects state on every invocation, so it picks up wherever
# the user left off.
#
# Usage:
#   ./discord-onboard.sh           # interactive
#   ./discord-onboard.sh --status  # print state and exit

set -euo pipefail

SERVICE="claude-discord-bot"
ACCOUNT="$USER"
STATE_DIR="$HOME/.claude/channels/discord"
ACCESS_FILE="$STATE_DIR/access.json"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]:-$0}")" && pwd)"
SETUP_SCRIPT="$SCRIPT_DIR/discord-setup.sh"

PURPLE='\033[38;2;124;58;237m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'

# ----------------------------------------------------------------------------
# State detection
# ----------------------------------------------------------------------------

has_token() {
  security find-generic-password -s "$SERVICE" -a "$ACCOUNT" -w >/dev/null 2>&1
}

has_paired() {
  # Paired iff access.json exists and allowFrom is a non-empty array.
  [ -f "$ACCESS_FILE" ] || return 1
  if command -v jq >/dev/null 2>&1; then
    [ "$(jq -r '.allowFrom | length' "$ACCESS_FILE" 2>/dev/null || echo 0)" -gt 0 ]
  else
    # jq fallback: a paired allowFrom looks like "allowFrom":["..."] (non-empty).
    grep -Eq '"allowFrom"[[:space:]]*:[[:space:]]*\[[[:space:]]*"' "$ACCESS_FILE"
  fi
}

print_state() {
  if has_token; then
    if has_paired; then
      printf "${BOLD}State:${NC} bot configured, at least one user paired (warm)\n"
    else
      printf "${BOLD}State:${NC} bot configured, no users paired yet (mid)\n"
    fi
  else
    printf "${BOLD}State:${NC} nothing set up (cold)\n"
  fi
}

# ----------------------------------------------------------------------------
# Walkthrough pieces
# ----------------------------------------------------------------------------

press_enter() {
  printf "${DIM}  Press enter when done...${NC} "
  local _; read -r _ </dev/tty || true
}

print_pairing_instructions() {
  cat <<'EOF'

  Pairing - last step.

    1. Open a new terminal window. Type:    claude
       (when the launcher asks "Connect to Discord Chat Agent?", answer Y)

    2. In Discord, find your bot in your DM list and send it any message.
       The bot will reply with a 6-character pairing code (e.g. "a3f7c2").

    3. Back in your Claude terminal session, type:
         /discord:access pair <the-6-char-code>

       Claude approves the pairing, the bot DMs you "you're in", and from
       that moment on you can chat with Claude through Discord.

  Optional, but recommended:

    Voice messages from Discord get transcribed locally so Claude can answer
    them as if you'd typed. If you haven't installed the 'voice' component
    yet, run:
         ampersand --only voice

    That brews whisper-cpp + ffmpeg and downloads a ~150 MB English speech
    model into ~/.cache/whisper/. Local-only, no API key.

EOF
}

walkthrough_existing_bot() {
  cat <<'EOF'

  Linking an existing Discord bot.

    1. Go to https://discord.com/developers/applications, pick your bot's
       application, click "Bot" in the left nav.

    2. If you don't already have the token saved somewhere safe, click
       "Reset Token" - this invalidates the old one. Copy the new token to
       your clipboard.

    3. Confirm "Message Content Intent" is ON under "Privileged Gateway
       Intents" further down the same Bot page.

EOF
  press_enter

  printf "\n  Paste the bot token now (input is hidden):\n  "
  local token
  read -r -s token </dev/tty
  printf "\n"
  if [ -z "$token" ]; then
    printf "  No token entered. Aborting - re-run this script when you're ready.\n\n"
    return 1
  fi

  printf "\n  Storing token in macOS Keychain...\n"
  bash "$SETUP_SCRIPT" "$token" || {
    printf "\n  Setup script failed. Re-run: bash %s\n\n" "$SETUP_SCRIPT" >&2
    return 1
  }
}

walkthrough_new_bot() {
  cat <<'EOF'

  Creating a new Discord bot from scratch.

    Step 1. Open https://discord.com/developers/applications in your browser.
            Sign in to Discord if it asks.

EOF
  press_enter

  cat <<'EOF'

    Step 2. Click the "New Application" button (top right). Name it whatever
            you want - "Claude Helper", "$YOUR_NAME's Coder", etc. Click
            "Create". This creates an Application, which is the wrapper
            around the bot.

EOF
  press_enter

  cat <<'EOF'

    Step 3. In the left nav, click "Bot". This is where the bot identity
            lives. Set a username and (optionally) an avatar.

EOF
  press_enter

  cat <<'EOF'

    Step 4. On the same Bot page, scroll down to "Privileged Gateway
            Intents". Toggle ON "Message Content Intent". Without this, the
            bot can't read your DMs. Click "Save Changes".

EOF
  press_enter

  cat <<'EOF'

    Step 5. Scroll back up on the Bot page and click "Reset Token". Confirm
            the reset. Copy the token that appears - this is the only time
            you'll see it. (If you lose it, just reset again.)

EOF
  press_enter

  cat <<'EOF'

    Step 6. In the left nav, click "OAuth2" -> "URL Generator". Tick the
            "bot" scope. Below that, tick "Send Messages", "Read Message
            History", and "Read Messages/View Channels". Copy the generated
            URL at the bottom.

EOF
  press_enter

  cat <<'EOF'

    Step 7. Paste that URL in a new browser tab. Authorize the bot - you can
            either invite it to a server you own, or just authorize it for
            DMs. (DMs alone are enough for one-on-one Claude chat.)

EOF
  press_enter

  printf "\n  Paste the bot token from Step 5 now (input is hidden):\n  "
  local token
  read -r -s token </dev/tty
  printf "\n"
  if [ -z "$token" ]; then
    printf "  No token entered. Aborting - re-run this script when you're ready.\n\n"
    return 1
  fi

  printf "\n  Storing token in macOS Keychain...\n"
  bash "$SETUP_SCRIPT" "$token" || {
    printf "\n  Setup script failed. Re-run: bash %s\n\n" "$SETUP_SCRIPT" >&2
    return 1
  }
}

# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------

mode="default"
for arg in "$@"; do
  case "$arg" in
    --status) mode="status" ;;
    --help|-h)
      sed -n '2,20p' "$0"
      exit 0
      ;;
  esac
done

if [ "$mode" = "status" ]; then
  print_state
  exit 0
fi

printf "${PURPLE}${BOLD}Discord Chat Agent onboarding${NC}\n\n"
print_state
printf "\n"

# Already paired - confirm and exit.
if has_token && has_paired; then
  cat <<'EOF'
  Looks like you're already set up. Bot token is in Keychain and at least
  one Discord user is paired. If something stopped working, you may want:

    bash ~/.claude/discord-setup.sh --rotate   # rotate the bot token
    /discord:access                            # inspect / edit allowlist
    cat ~/.claude/channels/discord/access.json # see raw state

  Otherwise, you're good. Type 'claude' to start a session.

EOF
  exit 0
fi

# Token but no pair - just show pairing instructions.
if has_token && ! has_paired; then
  cat <<'EOF'
  Token is configured but no Discord user has paired yet. Skip the bot
  creation steps and jump straight to pairing:

EOF
  print_pairing_instructions
  exit 0
fi

# Cold start - branch picker.
cat <<'EOF'
  Two paths to a working bot:

    [1] I already have a Discord bot. I just need to link it.
    [2] I need to make a new bot from scratch. Walk me through it.
    [3] Quit. I'll come back to this later.

EOF

printf "  Choice [1/2/3]: "
choice=""
read -r choice </dev/tty || true
choice="${choice:-3}"

case "$choice" in
  1) walkthrough_existing_bot && print_pairing_instructions ;;
  2) walkthrough_new_bot      && print_pairing_instructions ;;
  3) printf "\n  No problem. Re-run this script anytime.\n\n"; exit 0 ;;
  *) printf "\n  Unrecognized choice. Re-run when you're ready.\n\n"; exit 1 ;;
esac
