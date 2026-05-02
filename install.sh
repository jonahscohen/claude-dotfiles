#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# claude-dotfiles installer
# Interactive TUI over ten components:
#   brain       - Team rules + workflow (appended to CLAUDE.md) - ADDITIVE
#   config      - Hooks, plugins, permissions (merged into settings.json) - ADDITIVE
#   memory      - Additive memory subsystem (rules + 3 hooks + startup-check.sh loader)
#   skills      - Anthropic Skills (make-interfaces-feel-better + component-gallery-reference)
#   statusline  - Custom prompt-bar render (~/.claude/statusline-command.sh)
#   cmux        - cmux settings.json symlink
#   nvm         - .zshrc auto-activate of nvm default (so claude/node/npm land on PATH)
#   ampersand   - .zshrc 'ampersand' shell shortcut
#   voice       - whisper.cpp + ffmpeg + transcribe CLI for voice-message input
#   discord     - smart Discord-launcher source line in .zshrc + onboarding script
#
# Flags:
#   --yes              non-interactive, pick all components
#   --only KEYS        non-interactive, pick comma-separated keys (e.g. brain,config,memory)
#   --preset NAME      non-interactive preset: all | minimal | none
#                      minimal = brain + config + memory + skills + nvm
#   --dry-run          print picks and exit; touches no files
#   --help             print usage
#
# Idempotent. Safe to re-run.
# ============================================================

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$REPO_DIR/.backups/$(date +%Y%m%d-%H%M%S)"
BACKED_UP=0
SHORTCUTS_NEW=0  # Set to 1 when the .zshrc shortcut block is newly written/migrated/refreshed this run

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
ACCENT='\033[38;2;14;116;144m'  # #0e7490 - matches header box border + gradient start
DIM='\033[2m'
NC='\033[0m'

info()  { printf "${CYAN}[info]${NC}  %s\n" "$1"; }
ok()    { printf "${GREEN}[ok]${NC}    %s\n" "$1"; }
warn()  { printf "${YELLOW}[warn]${NC}  %s\n" "$1"; }
err()   { printf "${RED}[error]${NC} %s\n" "$1"; }

# ============================================================
# Component catalogue (parallel arrays for bash 3.2 compatibility)
# ============================================================

# Public components - shipped to all users.
KEYS=(brain config memory skills statusline cmux nvm ampersand voice discord)
TITLES=(
  "Team rules + workflow (appended to CLAUDE.md)"
  "Hooks, plugins, permissions (merged into settings.json)"
  "Memory discipline rules + hooks"
  "UI polish + component gallery research"
  "Custom prompt bar"
  "cmux split-pane terminal"
  "Node version manager PATH fix"
  "Installer shortcut in terminal"
  "Voice transcription (whisper.cpp)"
  "Discord chat agent launcher"
)
DESCS=(
  "ADDITIVE: appends team rules (from RULES.md) and shared workflow (from CLAUDE.md) to your ~/.claude/CLAUDE.md between marker comments. Your existing CLAUDE.md content is preserved above and below the markers. If you have a claude/CLAUDE.local.md for personal overrides, those are appended in their own marker block too. Re-runs detect the markers and skip. Deactivation removes only the marked blocks."
  "ADDITIVE: JSON-merges safety hooks (bash-guard, content-guard, memory-approve), memory-write allow patterns, enabled plugins, and marketplace entries into your existing ~/.claude/settings.json. Does NOT touch your defaultMode, model, or other preferences. Copies hook scripts to ~/.claude/hooks/ alongside any hooks you already have. Deactivation removes only our entries by marker."
  "ADDITIVE memory subsystem: appends our Memory Discipline rules (loading order, per-task updates, file format) to your CLAUDE.md between marker comments, JSON-merges three hooks (SessionStart loader, PreCompact reminder, PostCompact reload) into your settings.json, and symlinks the startup-check.sh loader. Does NOT replace or overwrite anything - all changes are marker-guarded so re-runs are no-ops, and the markers can be removed cleanly if you ever want to undo. Pick this if your team wants to beef up an existing Claude Code with persistent memory capability without losing their config."
  "Adds skills to ~/.claude/skills/, fully additive. Bundles make-interfaces-feel-better (tactical UI polish via npx) and component-gallery-reference (researches component.gallery before building UI components, filters by project tech stack, excludes unmaintained/a11y-issue sources). Does NOT touch your CLAUDE.md, settings.json, hooks, or statusline. Safe to pick standalone if you have your own Claude Code config and just want the skill capability."
  "Symlinks our statusline-command.sh into ~/.claude/. The settings.json statusLine command is tolerant of a missing script, so unticking this cleanly falls back to no custom statusline (Claude Code's default takes over). Pick this if you like our prompt-bar render; skip if you prefer Claude Code's default or a different statusline you've configured yourself."
  "Settings for cmux, the split-pane terminal that hosts the in-app browser preview Claude uses to verify your UI work. Skip if you don't use cmux."
  "A small one-line addition to your zsh config that fixes a specific issue some setups hit: opening a new terminal and getting 'claude not found in PATH' even though Claude is installed. The fix only activates if your zsh config already loads nvm (Node Version Manager) - on most machines this is a harmless no-op, so it's safe to leave on. If 'claude' already runs fine in fresh terminals on your machine, you can skip this."
  "Adds the 'ampersand' zsh function to your .zshrc. Type 'ampersand' from any terminal to re-launch this installer; type 'ampersand --pull' to pull the latest from GitHub first. Forwards every other flag ('ampersand --preset minimal', 'ampersand --pull --yes'). bootstrap.sh pre-installs this for new users so the curl one-liner is enough."
  "Adds local voice-to-text so Claude can answer Discord voice messages and any other audio attachment. Brews whisper-cpp and ffmpeg, downloads the ggml-base.en model (~150 MB) into ~/.cache/whisper, and symlinks bin/transcribe to ~/.claude/transcribe. Local-only (no cloud, no API key). Calls: '~/.claude/transcribe path/to/audio.ogg' prints the transcript on stdout."
  "Adds a smart 'Connect to Discord?' prompt to your 'claude' command. Three states: cold (no bot configured) offers the interactive onboarding walkthrough or 'never ask again'; mid (bot configured but no users paired) jumps you to the pairing flow; warm (paired) shows the familiar 5-second connect prompt with default Yes. The walkthrough handles both 'I have a bot, just paste the token' and 'walk me through making a new bot in the Developer Portal'. Skip this if you don't use Discord with Claude. Tokens are stored in macOS Keychain, never in the repo."
)
PICKS=(1 1 1 1 1 1 1 1 1 1)

# Personal components - hidden from public TUI and --help. Surfaced only when
# the maintainer passes --personal (undocumented, undocumented-on-purpose).
# Lets one human keep cross-machine sync for ghostty/shaders without exposing
# them as Yes&-team defaults.
PERSONAL_KEYS=(ghostty shaders)
PERSONAL_TITLES=(
  "Ghostty terminal look"
  "Ghostty visual effects (shaders)"
)
PERSONAL_DESCS=(
  "Personal: Ghostty terminal appearance (PolySans Neutral Mono font, custom 256-color palette, transparency, blur)."
  "Personal: cinematic Ghostty effects (CRT curvature, TFT pixel grid, blazing cursor trail). Also clones the wider community shader library."
)
PERSONAL_PICKS=(1 1)

key_index() {
  local target="$1" i
  for i in "${!KEYS[@]}"; do
    if [[ "${KEYS[$i]}" == "$target" ]]; then printf -- '%s' "$i"; return 0; fi
  done
  printf -- '%s' "-1"
}

picked() {
  local idx; idx="$(key_index "$1")"
  [[ "$idx" != "-1" && "${PICKS[$idx]}" == "1" ]]
}

set_pick() {
  local idx; idx="$(key_index "$1")"
  [[ "$idx" == "-1" ]] && return 0
  PICKS[$idx]="$2"
}

set_all() {
  local v="$1" i
  for i in "${!PICKS[@]}"; do PICKS[$i]="$v"; done
}

apply_only() {
  local csv="$1"
  set_all 0
  local IFS=','
  local k
  for k in $csv; do
    k="${k// /}"
    [[ -z "$k" ]] && continue
    if [[ "$k" == "claude" ]]; then
      warn "'claude' has been split into 'brain' and 'config'. Selecting both."
      set_pick brain 1
      set_pick config 1
      continue
    fi
    if [[ "$(key_index "$k")" == "-1" ]]; then
      err "Unknown component in --only: $k"
      err "Valid keys: ${KEYS[*]}"
      exit 2
    fi
    set_pick "$k" 1
  done
}

apply_preset() {
  case "$1" in
    all)     set_all 1 ;;
    none)    set_all 0 ;;
    minimal) set_all 0; set_pick brain 1; set_pick config 1; set_pick memory 1; set_pick skills 1; set_pick nvm 1 ;;
    *)       err "Unknown preset: $1 (valid: all, minimal, none)"; exit 2 ;;
  esac
}

# ============================================================
# Flag parsing
# ============================================================

NONINTERACTIVE=0
DRY_RUN=0

print_help() {
  cat <<'EOF'
claude-dotfiles installer

Usage:
  ./install.sh                  Interactive checkbox TUI (gum or text fallback)
  ./install.sh --yes            Non-interactive, install everything
  ./install.sh --preset NAME    Non-interactive preset: all | minimal | none
  ./install.sh --only KEYS      Non-interactive, comma-separated keys
                                (brain, config, memory, skills, statusline, cmux, nvm, ampersand, voice, discord)
  ./install.sh --dry-run        Print resolved picks and exit
  ./install.sh --help           Show this help
EOF
}

# Personal flag: undocumented on purpose. Adds three components (ghostty,
# shaders, discord) to the active KEYS set. When unset, those components
# are entirely invisible: not in TUI, not in --help, not valid in --only.
# Pre-pass to capture --personal before --only/--preset run their validation.
PERSONAL=0
for arg in "$@"; do
  case "$arg" in
    --personal) PERSONAL=1 ;;
  esac
done
if [[ "$PERSONAL" == "1" ]]; then
  KEYS+=("${PERSONAL_KEYS[@]}")
  TITLES+=("${PERSONAL_TITLES[@]}")
  DESCS+=("${PERSONAL_DESCS[@]}")
  PICKS+=("${PERSONAL_PICKS[@]}")
fi

HAS_ONLY=0
HAS_PRESET=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes|-y)       NONINTERACTIVE=1; shift ;;
    --only)         NONINTERACTIVE=1; HAS_ONLY=1; apply_only "${2:-}"; shift 2 ;;
    --preset)       NONINTERACTIVE=1; HAS_PRESET=1; apply_preset "${2:-}"; shift 2 ;;
    --dry-run|-n)   DRY_RUN=1; shift ;;
    --help|-h)      print_help; exit 0 ;;
    --personal)     shift ;;  # already consumed in pre-pass, just shift past it
    *)              err "Unknown flag: $1"; print_help; exit 2 ;;
  esac
done

# --yes without --only/--preset means "install everything"
# --yes WITH --only/--preset defers to their selection
if [[ "$NONINTERACTIVE" == "1" && "$HAS_ONLY" == "0" && "$HAS_PRESET" == "0" ]]; then
  set_all 1
fi

# ============================================================
# Pre-flight
# ============================================================

if [[ "$(uname)" != "Darwin" ]]; then
  err "This installer is built for macOS. Some target paths used here are macOS-specific."
  exit 1
fi

USER_HOME="$HOME"
ZSHRC="$HOME/.zshrc"
CLAUDE_DIR="$HOME/.claude"

# ============================================================
# TUI
# ============================================================

ensure_gum() {
  command -v gum >/dev/null 2>&1 && return 0
  if ! command -v brew >/dev/null 2>&1; then
    return 1
  fi
  printf "${CYAN}[info]${NC}  gum (TUI library) is not installed. Install via Homebrew? [Y/n] "
  local reply=""
  if [ -r /dev/tty ]; then read -r reply </dev/tty || true; fi
  reply="${reply:-Y}"
  case "$reply" in
    [Nn]*) return 1 ;;
  esac
  brew install gum >/dev/null 2>&1 || return 1
  command -v gum >/dev/null 2>&1
}

show_picks_summary() {
  printf "\n${ACCENT}Selected components${NC}\n"
  local i mark
  for i in "${!KEYS[@]}"; do
    if [[ "${PICKS[$i]}" == "1" ]]; then mark="${ACCENT}[x]${NC}"; else mark="${DIM}[ ]${NC}"; fi
    printf "  %b %-9s ${DIM}%s${NC}\n" "$mark" "${KEYS[$i]}" "${TITLES[$i]}"
  done
  printf "\n"
}

# Print a string with a one-shot shimmer reveal that settles into a static
# dark-cyan-to-light-cyan gradient. Replaces `gum style --foreground 212` for
# component titles in the TUI. Endpoints: dark cyan (#0e7490 = 14,116,144)
# -> light cyan (#67e8f9 = 103,232,249), with a brighter shimmer band
# (#cffafe = 207,250,254) that sweeps left-to-right once.
# Requires a 24-bit-color-capable terminal; falls back gracefully (text still
# prints, just without the gradient) if escape codes are stripped.
print_title_animated() {
  local text="$1"
  local len=${#text}
  [ "$len" -eq 0 ] && return

  local frames=6 frame i pos d intensity divisor
  local shimmer_width=5
  local r g b char
  divisor=$(( len > 1 ? len - 1 : 1 ))

  for ((frame=0; frame<frames; frame++)); do
    pos=$(( -shimmer_width + (len + 2 * shimmer_width) * frame / (frames - 1) ))
    printf '\r\033[K'
    for ((i=0; i<len; i++)); do
      char="${text:$i:1}"
      r=$(( 14  + (103 -  14) * i / divisor ))
      g=$(( 116 + (232 - 116) * i / divisor ))
      b=$(( 144 + (249 - 144) * i / divisor ))
      d=$(( i - pos ))
      [ "$d" -lt 0 ] && d=$(( -d ))
      if [ "$d" -lt "$shimmer_width" ]; then
        intensity=$(( (shimmer_width - d) * 100 / shimmer_width ))
        r=$(( r + (207 - r) * intensity / 100 ))
        g=$(( g + (250 - g) * intensity / 100 ))
        b=$(( b + (254 - b) * intensity / 100 ))
      fi
      printf '\033[38;2;%d;%d;%dm%s' "$r" "$g" "$b" "$char"
    done
    printf '\033[0m'
    sleep 0.03
  done

  # Settle: pure static gradient, no shimmer.
  printf '\r\033[K'
  for ((i=0; i<len; i++)); do
    char="${text:$i:1}"
    r=$(( 14  + (103 -  14) * i / divisor ))
    g=$(( 116 + (232 - 116) * i / divisor ))
    b=$(( 144 + (249 - 144) * i / divisor ))
    printf '\033[38;2;%d;%d;%dm%s' "$r" "$g" "$b" "$char"
  done
  printf '\033[0m\n'
}

# yes& brand banner. Hand-shaded ASCII; @/%/-/: outline 'yes', #/*/+/. shade '&'.
# Rendered in a single red (#dc2626) because the two letterforms interleave
# (the y-descender curls into the & loop on row 11), so column-bisection would
# clip wrong. Single color reads as a logo, not as two competing shapes.
print_yes_and_banner() {
  local LOGO_RED='\033[38;2;220;38;38m'
  local NC='\033[0m'
  printf '\n'
  printf '%b%s%b\n' "$LOGO_RED" "                                                         **  *  " "$NC"
  printf '%b%s%b\n' "$LOGO_RED" "                                                 ####   ####*   " "$NC"
  printf '%b%s%b\n' "$LOGO_RED" "                                              #*  *   + ####  ##" "$NC"
  printf '%b%s%b\n' "$LOGO_RED" "                                            ###  ##       -#####" "$NC"
  printf '%b%s%b\n' "$LOGO_RED" "                                           :####  .-  ######### " "$NC"
  printf '%b%s%b\n' "$LOGO_RED" " @@@@@@     @@@   @@@   @@@@    @@@   @@@@  ######   #######    " "$NC"
  printf '%b%s%b\n' "$LOGO_RED" "   @@@@     @@  @@@      @@@@  @@@      @@      ##  *##       # " "$NC"
  printf '%b%s%b\n' "$LOGO_RED" "    @@@@   @@  @@@@@@@@@@@@@@  @@@@@@@@       ###   -# *####   +" "$NC"
  printf '%b%s%b\n' "$LOGO_RED" "    %@@@@  @   @@@@              @@@@@@@@@   ####*   # ######  -" "$NC"
  printf '%b%s%b\n' "$LOGO_RED" "     @@@@ @    @@@@@                  @@@@@ .#####:    #-##   # " "$NC"
  printf '%b%s%b\n' "$LOGO_RED" "      @@@@.     @@@@@+    #@@ @@@@     @@@%  #######        #   " "$NC"
  printf '%b%s%b\n' "$LOGO_RED" "       @@@        @@@@@@@@@     @@@@@@@@@      ##########.      " "$NC"
  printf '%b%s%b\n' "$LOGO_RED" "       @@                                                       " "$NC"
  printf '%b%s%b\n' "$LOGO_RED" " @@- :@@                                                        " "$NC"
  printf '%b%s%b\n' "$LOGO_RED" "-@@@@@                                                          " "$NC"
  printf '\n'
}

run_tui_gum() {
  print_yes_and_banner
  gum style --border double --margin "1 0" --padding "1 2" --border-foreground "#0e7490" \
    "claude-dotfiles installer" "Pick what to install on this machine."

  local i
  for i in "${!KEYS[@]}"; do
    print_title_animated "${KEYS[$i]} - ${TITLES[$i]}"
    gum style --faint "  ${DESCS[$i]}"
  done
  printf "\n"

  # Default-selected list = currently picked keys (CSV for gum --selected)
  local sel=""
  for i in "${!KEYS[@]}"; do
    if [[ "${PICKS[$i]}" == "1" ]]; then
      [[ -n "$sel" ]] && sel="${sel},"
      sel="${sel}${KEYS[$i]}"
    fi
  done

  local chosen
  chosen="$(printf '%s\n' "${KEYS[@]}" \
    | gum choose --no-limit --selected "$sel" \
        --header "Space to toggle, enter to confirm" \
        --cursor.foreground "#67e8f9" \
        --selected.foreground "#67e8f9" \
        --item.foreground "#ffffff" \
        --cursor-prefix "[ ] " \
        --selected-prefix "[✓] " \
        --unselected-prefix "[ ] ")" || return 1

  set_all 0
  local k
  while IFS= read -r k; do
    [[ -z "$k" ]] && continue
    set_pick "$k" 1
  done <<< "$chosen"

  clear
  show_picks_summary
  gum confirm "Proceed with these components?" \
    --selected.background "#0e7490" \
    --selected.foreground "#ffffff" || return 1
  return 0
}

run_tui_fallback() {
  printf "\n${CYAN}claude-dotfiles installer${NC}\n"
  printf "Pick what to install. Default is everything on.\n\n"
  local i
  for i in "${!KEYS[@]}"; do
    printf "  ${GREEN}%d)${NC} %s ${DIM}- %s${NC}\n" "$((i+1))" "${TITLES[$i]}" "${KEYS[$i]}"
    printf "     ${DIM}%s${NC}\n" "${DESCS[$i]}"
  done
  printf "\n"
  printf "Enter the numbers to toggle off (space-separated), or press Enter to keep all: "

  local toggles=""
  if [ -r /dev/tty ]; then read -r toggles </dev/tty || true; fi

  local n
  for n in $toggles; do
    [[ "$n" =~ ^[0-9]+$ ]] || continue
    local idx=$((n-1))
    if [[ "$idx" -ge 0 && "$idx" -lt "${#KEYS[@]}" ]]; then
      PICKS[$idx]=0
    fi
  done

  clear
  show_picks_summary
  printf "Proceed? [Y/n] "
  local reply=""
  if [ -r /dev/tty ]; then read -r reply </dev/tty || true; fi
  reply="${reply:-Y}"
  case "$reply" in
    [Nn]*) return 1 ;;
  esac
  return 0
}

# ============================================================
# State file infrastructure (JSON, ~/.claude/.dotfiles-state)
# ============================================================
# Tracks per-component status (active / inactive / not-installed) so the
# installer can branch on fresh-vs-returning and offer the right actions.

STATE_FILE="$HOME/.claude/.dotfiles-state"

state_init_if_missing() {
  if [ ! -f "$STATE_FILE" ]; then
    mkdir -p "$(dirname "$STATE_FILE")"
    python3 - <<PY
import json, os, time
data = {
  "version": 1,
  "first_install_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
  "last_run_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
  "last_install_sha": "",
  "components": {}
}
with open("$STATE_FILE", "w") as f:
    json.dump(data, f, indent=2)
PY
  fi
}

state_get() {
  local key="$1"
  [ -f "$STATE_FILE" ] || { echo ""; return 0; }
  python3 -c "import json,sys; d=json.load(open('$STATE_FILE')); print(d.get('components',{}).get('$key',''))" 2>/dev/null
}

state_set() {
  local key="$1" val="$2"
  state_init_if_missing
  python3 - <<PY
import json, time
with open("$STATE_FILE") as f: d = json.load(f)
d.setdefault("components", {})["$key"] = "$val"
d["last_run_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
with open("$STATE_FILE", "w") as f: json.dump(d, f, indent=2)
PY
}

state_record_sha() {
  state_init_if_missing
  local sha
  sha=$(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || echo "unknown")
  python3 - <<PY
import json, time
with open("$STATE_FILE") as f: d = json.load(f)
d["last_install_sha"] = "$sha"
d["last_run_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
with open("$STATE_FILE", "w") as f: json.dump(d, f, indent=2)
PY
}

# ============================================================
# Per-component disk-based state detection
# ============================================================

detect_component() {
  local key="$1"
  case "$key" in
    brain)      grep -Fq "<!-- claude-dotfiles:brain:begin -->" "$CLAUDE_DIR/CLAUDE.md" 2>/dev/null && echo active || echo not-installed ;;
    config)     [ -f "$CLAUDE_DIR/hooks/bash-guard.sh" ] && echo active || echo not-installed ;;
    memory)     grep -Fq "<!-- claude-dotfiles:memory-discipline:begin -->" "$CLAUDE_DIR/CLAUDE.md" 2>/dev/null && echo active || echo not-installed ;;
    skills)     { [ -d "$CLAUDE_DIR/skills/make-interfaces-feel-better" ] || [ -d "$CLAUDE_DIR/skills/component-gallery-reference" ]; } && echo active || echo not-installed ;;
    statusline) [ -L "$CLAUDE_DIR/statusline-command.sh" ] && echo active || echo not-installed ;;
    cmux)       [ -L "$HOME/.config/cmux/settings.json" ] && echo active || echo not-installed ;;
    nvm)        grep -Fq "nvm use default --silent" "$ZSHRC" 2>/dev/null && echo active || echo not-installed ;;
    ampersand)  grep -Fq "# === claude-dotfiles:shortcuts:begin ===" "$ZSHRC" 2>/dev/null && echo active || echo not-installed ;;
    voice)      [ -L "$CLAUDE_DIR/transcribe" ] && echo active || echo not-installed ;;
    discord)    grep -Fq "discord-chat-launcher.sh" "$ZSHRC" 2>/dev/null && echo active || echo not-installed ;;
    *)          echo not-installed ;;
  esac
}

# Combine disk truth with state-file annotation. Disk wins; state file
# disambiguates "inactive" (was installed, then deactivated) from "never installed".
effective_state() {
  local key="$1"
  local disk; disk=$(detect_component "$key")
  if [ "$disk" = "active" ]; then echo "active"; return; fi
  local stored; stored=$(state_get "$key")
  if [ "$stored" = "inactive" ]; then echo "inactive"; return; fi
  echo "not-installed"
}

# ============================================================
# Update check (git fetch + git log HEAD..origin/main)
# ============================================================

check_updates() {
  cd "$REPO_DIR" || return 1
  git fetch origin main >/dev/null 2>&1 || return 1
  local commits
  commits=$(git log HEAD..origin/main --pretty=format:'%s' 2>/dev/null | head -10)
  [ -n "$commits" ] && printf '%s\n' "$commits"
}

apply_update() {
  cd "$REPO_DIR" || return 1
  git pull --ff-only
}

# ============================================================
# Deactivation functions (per-component undo)
# ============================================================
# Each function removes the on-disk artifacts for one component while
# leaving the dotfiles repo source intact. Safe to call when a component
# is already inactive (no-op).

deactivate_brain() {
  if [ -f "$CLAUDE_DIR/CLAUDE.md" ] && [ ! -L "$CLAUDE_DIR/CLAUDE.md" ]; then
    if grep -Fq "<!-- claude-dotfiles:brain:begin -->" "$CLAUDE_DIR/CLAUDE.md"; then
      sed -i.bak '/<!-- claude-dotfiles:brain:begin -->/,/<!-- claude-dotfiles:brain:end -->/d' "$CLAUDE_DIR/CLAUDE.md"
      rm -f "$CLAUDE_DIR/CLAUDE.md.bak"
    fi
    if grep -Fq "<!-- claude-dotfiles:local:begin -->" "$CLAUDE_DIR/CLAUDE.md"; then
      sed -i.bak '/<!-- claude-dotfiles:local:begin -->/,/<!-- claude-dotfiles:local:end -->/d' "$CLAUDE_DIR/CLAUDE.md"
      rm -f "$CLAUDE_DIR/CLAUDE.md.bak"
    fi
    if [ ! -s "$CLAUDE_DIR/CLAUDE.md" ] || ! grep -q '[^[:space:]]' "$CLAUDE_DIR/CLAUDE.md" 2>/dev/null; then
      rm -f "$CLAUDE_DIR/CLAUDE.md"
    fi
  fi
  if [ -L "$CLAUDE_DIR/CLAUDE.md" ] && [[ "$(readlink "$CLAUDE_DIR/CLAUDE.md")" == "$REPO_DIR/"* ]]; then
    rm -f "$CLAUDE_DIR/CLAUDE.md"
  fi
}

deactivate_config() {
  local f
  for f in bash-guard.sh content-guard.sh memory-approve.sh; do
    if [ -L "$CLAUDE_DIR/hooks/$f" ] && [[ "$(readlink "$CLAUDE_DIR/hooks/$f")" == "$REPO_DIR/"* ]]; then
      rm -f "$CLAUDE_DIR/hooks/$f"
    elif [ -f "$CLAUDE_DIR/hooks/$f" ] && grep -Fq "claude-dotfiles" "$CLAUDE_DIR/hooks/$f" 2>/dev/null; then
      rm -f "$CLAUDE_DIR/hooks/$f"
    fi
  done
  if [ -L "$CLAUDE_DIR/startup-check.sh" ] && [[ "$(readlink "$CLAUDE_DIR/startup-check.sh")" == "$REPO_DIR/"* ]]; then
    rm -f "$CLAUDE_DIR/startup-check.sh"
  elif [ -f "$CLAUDE_DIR/startup-check.sh" ] && grep -Fq "claude-dotfiles" "$CLAUDE_DIR/startup-check.sh" 2>/dev/null; then
    rm -f "$CLAUDE_DIR/startup-check.sh"
  fi
  if [ -L "$CLAUDE_DIR/settings.json" ] && [[ "$(readlink "$CLAUDE_DIR/settings.json")" == "$REPO_DIR/"* ]]; then
    rm -f "$CLAUDE_DIR/settings.json"
  fi
  if [ -f "$CLAUDE_DIR/settings.json" ] && [ ! -L "$CLAUDE_DIR/settings.json" ]; then
    python3 - "$CLAUDE_DIR/settings.json" <<'PYCONFIG'
import json, sys
path = sys.argv[1]
try:
    with open(path) as f:
        d = json.load(f)
except Exception:
    sys.exit(0)
OUR_HOOK_MARKERS = ["bash-guard.sh", "content-guard.sh", "memory-approve.sh"]
hooks = d.get("hooks", {})
for hook_type in ["PreToolUse"]:
    entries = hooks.get(hook_type, [])
    filtered = [e for e in entries if not any(m in json.dumps(e) for m in OUR_HOOK_MARKERS)]
    if filtered:
        hooks[hook_type] = filtered
    elif hook_type in hooks:
        del hooks[hook_type]
OUR_ALLOW = [
    "Bash(npx create-next-app@latest:*)", "Bash(claude mcp:*)", "mcp__pencil",
]
MEMORY_PREFIXES = [
    "Write(**/.claude/memory/", "Edit(**/.claude/memory/", "MultiEdit(**/.claude/memory/",
    "Write(/Users/*/.claude/projects/", "Edit(/Users/*/.claude/projects/", "MultiEdit(/Users/*/.claude/projects/",
    "Write(/Users/**/memory/", "Edit(/Users/**/memory/", "MultiEdit(/Users/**/memory/",
    "Write(/home/**/memory/", "Edit(/home/**/memory/", "MultiEdit(/home/**/memory/",
    "Write(**/memory/", "Edit(**/memory/", "MultiEdit(**/memory/",
    "Write(**/MEMORY.md)", "Edit(**/MEMORY.md)", "MultiEdit(**/MEMORY.md)",
    "Write(.claude/memory/", "Edit(.claude/memory/", "MultiEdit(.claude/memory/",
    "Write(~/.claude/projects/", "Edit(~/.claude/projects/", "MultiEdit(~/.claude/projects/",
    "Write(**/*.md)", "Edit(**/*.md)", "MultiEdit(**/*.md)",
]
perms = d.get("permissions", {})
allow = perms.get("allow", [])
filtered_allow = [p for p in allow if p not in OUR_ALLOW and not any(p.startswith(pfx) for pfx in MEMORY_PREFIXES)]
if filtered_allow:
    perms["allow"] = filtered_allow
elif "allow" in perms:
    del perms["allow"]
OUR_PLUGINS = [
    "claude-md-management@claude-plugins-official", "figma@claude-plugins-official",
    "firebase@claude-plugins-official", "github@claude-plugins-official",
    "hookify@claude-plugins-official", "learning-output-style@claude-plugins-official",
    "semgrep@claude-plugins-official", "skill-creator@claude-plugins-official",
    "sentry@claude-plugins-official", "supabase@claude-plugins-official",
    "swift-lsp@claude-plugins-official", "superpowers@claude-plugins-official",
    "agent-sdk-dev@claude-plugins-official", "vercel@claude-plugins-official",
    "typescript-lsp@claude-plugins-official", "security-guidance@claude-plugins-official",
    "discord@claude-plugins-official", "feature-dev@claude-plugins-official",
    "ralph-loop@claude-plugins-official", "code-review@claude-plugins-official",
    "plugin-developer-toolkit@claude-plugins-official", "chrome-devtools@claude-plugins-official",
    "impeccable@impeccable",
]
plugins = d.get("enabledPlugins", {})
for p in OUR_PLUGINS:
    plugins.pop(p, None)
if not plugins and "enabledPlugins" in d:
    del d["enabledPlugins"]
OUR_MARKETS = ["impeccable", "buildwithclaude"]
markets = d.get("extraKnownMarketplaces", {})
for m in OUR_MARKETS:
    markets.pop(m, None)
if not markets and "extraKnownMarketplaces" in d:
    del d["extraKnownMarketplaces"]
if not hooks:
    d.pop("hooks", None)
if not perms.get("allow") and "defaultMode" not in perms:
    d.pop("permissions", None)
with open(path, "w") as f:
    json.dump(d, f, indent=2)
    f.write("\n")
PYCONFIG
  fi
}

deactivate_memory() {
  [ -L "$CLAUDE_DIR/startup-check.sh" ] && rm -f "$CLAUDE_DIR/startup-check.sh"
  if [ -f "$CLAUDE_DIR/CLAUDE.md" ] && [ ! -L "$CLAUDE_DIR/CLAUDE.md" ] \
      && grep -Fq "<!-- claude-dotfiles:memory-discipline:begin -->" "$CLAUDE_DIR/CLAUDE.md"; then
    sed -i.bak '/<!-- claude-dotfiles:memory-discipline:begin -->/,/<!-- claude-dotfiles:memory-discipline:end -->/d' "$CLAUDE_DIR/CLAUDE.md"
    rm -f "$CLAUDE_DIR/CLAUDE.md.bak"
  fi
  if [ -f "$CLAUDE_DIR/settings.json" ] && [ ! -L "$CLAUDE_DIR/settings.json" ]; then
    python3 - <<'PY'
import json, os
path = os.path.expanduser("~/.claude/settings.json")
try:
    with open(path) as f: d = json.load(f)
except Exception:
    raise SystemExit(0)
hooks = d.get("hooks", {})
LOADER = "startup-check.sh"
PRECOMPACT_MARK = "PreCompact: flushing pending memory"
def filt(entries, marker):
    return [e for e in entries if marker not in json.dumps(e)]
if "SessionStart" in hooks:
    hooks["SessionStart"] = filt(hooks["SessionStart"], LOADER)
    if not hooks["SessionStart"]: del hooks["SessionStart"]
if "PreCompact" in hooks:
    hooks["PreCompact"] = filt(hooks["PreCompact"], PRECOMPACT_MARK)
    if not hooks["PreCompact"]: del hooks["PreCompact"]
if "PostCompact" in hooks:
    hooks["PostCompact"] = filt(hooks["PostCompact"], LOADER)
    if not hooks["PostCompact"]: del hooks["PostCompact"]
if not hooks: d.pop("hooks", None)
with open(path, "w") as f:
    json.dump(d, f, indent=2)
    f.write("\n")
PY
  fi
}

deactivate_skills() {
  [ -d "$CLAUDE_DIR/skills/make-interfaces-feel-better" ] && rm -rf "$CLAUDE_DIR/skills/make-interfaces-feel-better"
  [ -d "$CLAUDE_DIR/skills/component-gallery-reference" ] && rm -rf "$CLAUDE_DIR/skills/component-gallery-reference"
}

deactivate_voice() {
  if [ -L "$CLAUDE_DIR/transcribe" ] && [[ "$(readlink "$CLAUDE_DIR/transcribe")" == "$REPO_DIR/"* ]]; then
    rm -f "$CLAUDE_DIR/transcribe"
  fi
}

deactivate_discord() {
  if [ -f "$ZSHRC" ] && grep -Fq "discord-chat-launcher.sh" "$ZSHRC"; then
    sed -i.bak '/# Discord Chat Agent launcher/d; /discord-chat-launcher\.sh.*claude-dotfiles/d' "$ZSHRC"
    rm -f "$ZSHRC.bak"
  fi
  local f
  for f in discord-chat-launcher.sh discord-onboard.sh discord-setup.sh; do
    if [ -L "$CLAUDE_DIR/$f" ] && [[ "$(readlink "$CLAUDE_DIR/$f")" == "$REPO_DIR/"* ]]; then
      rm -f "$CLAUDE_DIR/$f"
    fi
  done
}

deactivate_statusline() {
  [ -L "$CLAUDE_DIR/statusline-command.sh" ] && rm -f "$CLAUDE_DIR/statusline-command.sh"
}

deactivate_cmux() {
  [ -L "$HOME/.config/cmux/settings.json" ] && rm -f "$HOME/.config/cmux/settings.json"
}

deactivate_nvm() {
  if [ -f "$ZSHRC" ] && grep -Fq "nvm use default --silent" "$ZSHRC"; then
    sed -i.bak '/# Auto-activate nvm default so claude\/node\/npm are on PATH in new shells/d; /^nvm use default --silent 2>\/dev\/null$/d' "$ZSHRC"
    rm -f "$ZSHRC.bak"
  fi
}

deactivate_ampersand() {
  if [ -f "$ZSHRC" ] && grep -Fq "# === claude-dotfiles:shortcuts:begin ===" "$ZSHRC"; then
    sed -i.bak '/# === claude-dotfiles:shortcuts:begin ===/,/# === claude-dotfiles:shortcuts:end ===/d' "$ZSHRC"
    rm -f "$ZSHRC.bak"
  fi
}

deactivate_component() {
  case "$1" in
    brain)      deactivate_brain ;;
    config)     deactivate_config ;;
    memory)     deactivate_memory ;;
    skills)     deactivate_skills ;;
    statusline) deactivate_statusline ;;
    cmux)       deactivate_cmux ;;
    nvm)        deactivate_nvm ;;
    ampersand)  deactivate_ampersand ;;
    voice)      deactivate_voice ;;
    discord)    deactivate_discord ;;
  esac
}

# ============================================================
# Fresh-install flow: logo + 2 options (whole / a la carte)
# ============================================================

fresh_flow() {
  clear
  print_yes_and_banner

  local choice
  if command -v gum >/dev/null 2>&1; then
    choice=$(printf '%s\n' "Install the whole thing" "Install à la carte" | \
      gum choose --header "Welcome. Two ways to do this:" \
        --cursor.foreground "#67e8f9" \
        --selected.foreground "#67e8f9" \
        --item.foreground "#ffffff") || { warn "Aborted."; exit 0; }
  else
    printf "\nWelcome. Two ways to do this:\n  1) Install the whole thing\n  2) Install à la carte\n\nEnter 1 or 2 [1]: "
    local n=""
    [ -r /dev/tty ] && read -r n </dev/tty
    case "${n:-1}" in
      2) choice="Install à la carte" ;;
      *) choice="Install the whole thing" ;;
    esac
  fi

  if [[ "$choice" == "Install the whole thing" ]]; then
    set_all 1
    clear
    show_picks_summary
    if command -v gum >/dev/null 2>&1; then
      gum confirm "Install all of these?" \
        --selected.background "#0e7490" \
        --selected.foreground "#ffffff" || { warn "Aborted."; exit 0; }
    else
      printf "Install all of these? [Y/n] "
      local r=""
      [ -r /dev/tty ] && read -r r </dev/tty
      case "$r" in [Nn]*) warn "Aborted."; exit 0 ;; esac
    fi
  else
    if command -v gum >/dev/null 2>&1; then
      run_tui_gum || { warn "Aborted at confirmation."; exit 0; }
    else
      run_tui_fallback || { warn "Aborted at confirmation."; exit 0; }
    fi
  fi
}

# ============================================================
# Returning-user flow: update check + per-component action loop
# ============================================================

returning_flow() {
  clear
  print_yes_and_banner

  printf "Checking for updates...\n\n"
  local updates
  updates=$(check_updates 2>/dev/null || true)
  if [ -n "$updates" ]; then
    printf "${GREEN}Updates available:${NC}\n"
    printf "%s\n" "$updates" | sed 's/^/  + /'
    printf "\n"

    local apply_choice="no"
    if command -v gum >/dev/null 2>&1; then
      gum confirm "Pull updates now?" \
        --selected.background "#0e7490" \
        --selected.foreground "#ffffff" \
        && apply_choice=yes || apply_choice=no
    else
      printf "Pull updates now? [Y/n] "
      local r=""
      [ -r /dev/tty ] && read -r r </dev/tty
      case "$r" in [Nn]*) apply_choice=no ;; *) apply_choice=yes ;; esac
    fi

    if [[ "$apply_choice" == "yes" ]]; then
      apply_update
      ok "Updates applied."
      printf "\n${ACCENT}Restart 'ampersand' to pick up the new version.${NC}\n\n"
      exit 0
    fi
  else
    ok "Up to date."
  fi

  # Action loop
  local did_install=0
  while true; do
    clear
    print_yes_and_banner
    printf "${ACCENT}Components${NC}\n"
    local i status display
    for i in "${!KEYS[@]}"; do
      status=$(effective_state "${KEYS[$i]}")
      case "$status" in
        active)        display="${GREEN}active${NC}" ;;
        inactive)      display="${YELLOW}inactive${NC}" ;;
        not-installed) display="${DIM}not installed${NC}" ;;
      esac
      printf "  %-14s %-20b ${DIM}%s${NC}\n" "${KEYS[$i]}" "$display" "${TITLES[$i]}"
    done
    printf "\n"

    local options=()
    options+=("(quit)")
    for i in "${!KEYS[@]}"; do
      options+=("$(printf '%-14s %s' "${KEYS[$i]}" "${TITLES[$i]}")")
    done

    local pick=""
    if command -v gum >/dev/null 2>&1; then
      local raw_pick
      raw_pick=$(printf '%s\n' "${options[@]}" | \
        gum choose --header "Pick a component, or quit" \
          --header.foreground "#0e7490" \
          --cursor.foreground "#67e8f9" \
          --selected.foreground "#67e8f9" \
          --item.foreground "#ffffff") || break
      # Extract just the key (first word)
      pick="${raw_pick%% *}"
    else
      printf "\nComponents:\n"
      for i in "${!KEYS[@]}"; do
        printf "  %-12s %s\n" "${KEYS[$i]}" "${TITLES[$i]}"
      done
      printf "\nPick (or 'quit'): "
      [ -r /dev/tty ] && read -r pick </dev/tty || break
    fi
    [[ -z "$pick" || "$pick" == "(quit)" || "$pick" == "quit" ]] && break

    if [[ "$(key_index "$pick")" == "-1" ]]; then
      warn "Unknown component: $pick"
      continue
    fi

    local current; current=$(effective_state "$pick")
    local actions=()
    case "$current" in
      active)        actions=("deactivate") ;;
      inactive)      actions=("activate" "remove from state") ;;
      not-installed) actions=("install") ;;
    esac
    actions+=("(back)")

    local action=""
    if command -v gum >/dev/null 2>&1; then
      action=$(printf '%s\n' "${actions[@]}" | \
        gum choose --header "What do you want to do with '$pick'? (currently $current)" \
          --header.foreground "#0e7490" \
          --cursor.foreground "#67e8f9" \
          --selected.foreground "#67e8f9" \
          --item.foreground "#ffffff") || continue
    else
      printf "'%s' is %s. Actions: %s\nPick: " "$pick" "$current" "${actions[*]}"
      [ -r /dev/tty ] && read -r action </dev/tty || continue
    fi
    [[ -z "$action" || "$action" == "(back)" ]] && continue

    case "$action" in
      install|activate)
        # Run the install in a subshell so we stay inside the action loop and
        # redraw the menu after. Use _AMPERSAND_NO_SUMMARY=1 to suppress the
        # subshell's verbose post-install summary (which is fine for top-level
        # runs but jarring mid-session). Capture output to a tempfile and show
        # the last 20 lines only on failure.
        local logfile; logfile=$(mktemp)
        printf "\nInstalling %s...\n" "$pick"
        if _AMPERSAND_NO_SUMMARY=1 bash "$0" --only "$pick" --yes >"$logfile" 2>&1; then
          ok "$pick installed."
        else
          err "$pick install failed. Last 20 lines:"
          tail -20 "$logfile"
        fi
        rm -f "$logfile"
        sleep 1.0
        ;;
      deactivate)
        deactivate_component "$pick"
        state_set "$pick" "inactive"
        ok "$pick deactivated."
        sleep 0.8
        ;;
      "remove from state")
        state_set "$pick" "not-installed"
        ok "$pick cleared from state."
        sleep 0.8
        ;;
    esac
  done

  if [ "$did_install" -eq 0 ]; then
    state_record_sha
    printf "\n"
    exit 0
  fi
  # else: fall through to existing apply phase, which will install the picked component
}

# ============================================================
# Entry point: dispatch to fresh, returning, or non-interactive flag path
# ============================================================

if [[ "$NONINTERACTIVE" == "0" ]]; then
  ensure_gum >/dev/null 2>&1 || true

  # If any component is already active on disk but the state file is missing,
  # the user is a returning user from before the state file was introduced.
  # Bootstrap the state file from on-disk reality before dispatching.
  if [ ! -f "$STATE_FILE" ]; then
    any_active=0
    for k in "${KEYS[@]}"; do
      [ "$(detect_component "$k")" = "active" ] && { any_active=1; break; }
    done
    if [ "$any_active" -eq 1 ]; then
      info "First run with state-file tracking - detecting existing components..."
      state_init_if_missing
      for k in "${KEYS[@]}"; do
        state_set "$k" "$(detect_component "$k")"
      done
      state_record_sha
    fi
  fi

  # Migrate legacy 'claude' state entry to brain + config
  if [ -f "$STATE_FILE" ]; then
    _legacy_claude=$(state_get "claude" 2>/dev/null || true)
    if [ -n "$_legacy_claude" ]; then
      state_set "brain" "$_legacy_claude"
      state_set "config" "$_legacy_claude"
      python3 -c "
import json
with open('$STATE_FILE') as f: d = json.load(f)
d.get('components', {}).pop('claude', None)
with open('$STATE_FILE', 'w') as f:
    json.dump(d, f, indent=2)
    f.write('\n')
" 2>/dev/null || true
      info "Migrated legacy 'claude' state to 'brain' + 'config'"
    fi
  fi

  if [ -f "$STATE_FILE" ]; then
    returning_flow
  else
    fresh_flow
  fi
fi

if [[ "$DRY_RUN" == "1" ]]; then
  show_picks_summary
  info "--dry-run: no files were touched."
  exit 0
fi

# ============================================================
# Helpers (apply phase)
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

  if [ -L "$target" ] && [ "$(readlink "$target")" = "$source" ]; then
    ok "$target (already linked)"
    return
  fi

  backup_if_exists "$target"

  if [ -e "$target" ] || [ -L "$target" ]; then
    rm "$target"
  fi

  mkdir -p "$(dirname "$target")"
  ln -s "$source" "$target"
  ok "$target -> $source"
}

# ============================================================
# 1. Brain (team rules + workflow, appended to CLAUDE.md)
# ============================================================

if picked brain; then
  echo ""
  info "--- Brain (team rules + workflow) ---"
  mkdir -p "$CLAUDE_DIR"

  BRAIN_BEGIN='<!-- claude-dotfiles:brain:begin -->'
  BRAIN_END='<!-- claude-dotfiles:brain:end -->'
  LOCAL_BEGIN='<!-- claude-dotfiles:local:begin -->'
  LOCAL_END='<!-- claude-dotfiles:local:end -->'
  TARGET_MD="$CLAUDE_DIR/CLAUDE.md"

  # Legacy migration: if CLAUDE.md is a symlink to our repo, convert to real file
  if [ -L "$TARGET_MD" ] && [[ "$(readlink "$TARGET_MD")" == "$REPO_DIR/"* ]]; then
    warn "Migrating legacy symlinked CLAUDE.md to a real file..."
    cp -L "$TARGET_MD" "$TARGET_MD.migrated"
    rm -f "$TARGET_MD"
    mv "$TARGET_MD.migrated" "$TARGET_MD"
  fi

  [ -f "$TARGET_MD" ] || touch "$TARGET_MD"

  # Remove old block if present (so re-runs pick up content changes)
  if grep -Fq "$BRAIN_BEGIN" "$TARGET_MD" 2>/dev/null; then
    sed -i.bak "/$BRAIN_BEGIN/,/$BRAIN_END/d" "$TARGET_MD"
    rm -f "$TARGET_MD.bak"
  fi

  # Also handle legacy marker from the old claude component
  if grep -Fq "<!-- claude-dotfiles:rules:begin -->" "$TARGET_MD" 2>/dev/null; then
    sed -i.bak '/<!-- claude-dotfiles:rules:begin -->/,/<!-- claude-dotfiles:rules:end -->/d' "$TARGET_MD"
    rm -f "$TARGET_MD.bak"
  fi

  {
    printf '\n%s\n' "$BRAIN_BEGIN"
    cat "$REPO_DIR/claude/RULES.md"
    printf '\n'
    cat "$REPO_DIR/claude/CLAUDE.md"
    printf '\n%s\n' "$BRAIN_END"
  } >> "$TARGET_MD"
  ok "Team rules + workflow appended to $TARGET_MD (marker-guarded)"

  # CLAUDE.local.md personal overrides in their own marker block
  if [ -f "$REPO_DIR/claude/CLAUDE.local.md" ]; then
    if grep -Fq "$LOCAL_BEGIN" "$TARGET_MD" 2>/dev/null; then
      sed -i.bak "/$LOCAL_BEGIN/,/$LOCAL_END/d" "$TARGET_MD"
      rm -f "$TARGET_MD.bak"
    fi
    {
      printf '\n%s\n' "$LOCAL_BEGIN"
      cat "$REPO_DIR/claude/CLAUDE.local.md"
      printf '\n%s\n' "$LOCAL_END"
    } >> "$TARGET_MD"
    info "Appended CLAUDE.local.md (personal overrides, marker-guarded)"
  fi
fi

# ============================================================
# 2. Config (hooks, plugins, permissions merged into settings.json)
# ============================================================

if picked config; then
  echo ""
  info "--- Config (hooks, plugins, permissions) ---"
  mkdir -p "$CLAUDE_DIR/hooks"

  USER_SETTINGS="$CLAUDE_DIR/settings.json"

  # Legacy migration: if settings.json is a symlink to our repo, convert to real file
  if [ -L "$USER_SETTINGS" ] && [[ "$(readlink "$USER_SETTINGS")" == "$REPO_DIR/"* ]]; then
    warn "Migrating legacy symlinked settings.json to a real file..."
    cp -L "$USER_SETTINGS" "$USER_SETTINGS.migrated"
    rm -f "$USER_SETTINGS"
    mv "$USER_SETTINGS.migrated" "$USER_SETTINGS"
  fi

  [ -f "$USER_SETTINGS" ] || echo '{}' > "$USER_SETTINGS"

  # Copy hook scripts
  for f in bash-guard.sh content-guard.sh memory-approve.sh; do
    if [ -f "$REPO_DIR/claude/hooks/$f" ]; then
      cp "$REPO_DIR/claude/hooks/$f" "$CLAUDE_DIR/hooks/$f"
      chmod +x "$CLAUDE_DIR/hooks/$f"
      ok "hooks/$f"
    fi
  done

  # Copy startup-check.sh
  cp "$REPO_DIR/claude/startup-check.sh" "$CLAUDE_DIR/startup-check.sh"
  chmod +x "$CLAUDE_DIR/startup-check.sh"
  ok "startup-check.sh"

  # JSON-merge our entries into settings.json
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$USER_SETTINGS" "$REPO_DIR/claude/settings.json" <<'PYMERGE'
import json, sys

user_path = sys.argv[1]
repo_path = sys.argv[2]

with open(user_path) as f:
    user = json.load(f)
with open(repo_path) as f:
    repo = json.load(f)

# Hooks: merge by checking if command string already present
user_hooks = user.setdefault("hooks", {})
repo_hooks = repo.get("hooks", {})
for hook_type, repo_entries in repo_hooks.items():
    existing = user_hooks.get(hook_type, [])
    for repo_entry in repo_entries:
        already = False
        for rh in repo_entry.get("hooks", []):
            cmd = rh.get("command", "")
            if cmd and any(cmd in json.dumps(ex) for ex in existing):
                already = True
                break
        if not already:
            existing.append(repo_entry)
    user_hooks[hook_type] = existing

# Permissions: merge allow patterns (don't touch defaultMode)
user_perms = user.setdefault("permissions", {})
user_allow = user_perms.setdefault("allow", [])
repo_allow = repo.get("permissions", {}).get("allow", [])
for pat in repo_allow:
    if pat not in user_allow:
        user_allow.append(pat)

# Plugins: merge (add ours, keep theirs)
repo_plugins = repo.get("enabledPlugins", {})
user_plugins = user.setdefault("enabledPlugins", {})
for name, val in repo_plugins.items():
    if name not in user_plugins:
        user_plugins[name] = val

# Marketplaces: merge
repo_markets = repo.get("extraKnownMarketplaces", {})
user_markets = user.setdefault("extraKnownMarketplaces", {})
for name, val in repo_markets.items():
    if name not in user_markets:
        user_markets[name] = val

# StatusLine: only set if user doesn't have one
if "statusLine" not in user and "statusLine" in repo:
    user["statusLine"] = repo["statusLine"]

with open(user_path, "w") as f:
    json.dump(user, f, indent=2)
    f.write("\n")
PYMERGE
    ok "Hooks, plugins, permissions merged into $USER_SETTINGS"
  else
    warn "python3 not found - cannot merge settings.json. Install python3 and re-run."
  fi
fi

# ============================================================
# 3. Memory subsystem (additive: rules + hooks + loader)
# ============================================================
# Three surgical, idempotent operations:
#   (a) Symlink startup-check.sh into ~/.claude/ (no-op if already linked)
#   (b) Append the Memory Discipline section from our CLAUDE.md (extracted
#       between marker comments) to the user's ~/.claude/CLAUDE.md.
#       Marker-guarded so re-runs detect presence and skip.
#   (c) JSON-merge three hooks (SessionStart, PreCompact, PostCompact) into
#       the user's ~/.claude/settings.json without disturbing their other
#       config. Marker strings in the hook commands make this idempotent.
# All three are no-ops if the user already picked `claude` (which symlinked
# our full CLAUDE.md and settings.json).

if picked memory; then
  echo ""
  info "--- Memory subsystem ---"
  mkdir -p "$CLAUDE_DIR"

  # (a) startup-check.sh symlink
  make_symlink "$REPO_DIR/claude/startup-check.sh" "$CLAUDE_DIR/startup-check.sh"
  chmod +x "$REPO_DIR/claude/startup-check.sh"

  # (b) CLAUDE.md memory-discipline section append
  MEMORY_BEGIN_MARKER='<!-- claude-dotfiles:memory-discipline:begin -->'
  MEMORY_END_MARKER='<!-- claude-dotfiles:memory-discipline:end -->'
  USER_CLAUDE_MD="$CLAUDE_DIR/CLAUDE.md"

  if [ -f "$USER_CLAUDE_MD" ] && grep -Fq "$MEMORY_BEGIN_MARKER" "$USER_CLAUDE_MD"; then
    ok "$USER_CLAUDE_MD already contains the Memory Discipline section"
  else
    if [ ! -e "$USER_CLAUDE_MD" ]; then
      info "$USER_CLAUDE_MD does not exist - creating with just the Memory Discipline section"
      touch "$USER_CLAUDE_MD"
    else
      info "Appending Memory Discipline section to $USER_CLAUDE_MD"
    fi
    { printf '\n'; cat "$REPO_DIR/claude/memory-discipline-section.md"; } >> "$USER_CLAUDE_MD"
    ok "Memory Discipline section added to $USER_CLAUDE_MD"
  fi

  # (c) settings.json hook JSON-merge (Python: stdlib only)
  USER_SETTINGS="$CLAUDE_DIR/settings.json"
  if [ ! -e "$USER_SETTINGS" ]; then
    info "$USER_SETTINGS does not exist - creating with just the memory hooks"
    echo '{}' > "$USER_SETTINGS"
  fi

  if command -v python3 >/dev/null 2>&1; then
    if [ ! -L "$USER_SETTINGS" ]; then
      backup_if_exists "$USER_SETTINGS"
    fi
    python3 - "$USER_SETTINGS" <<'PY'
import json, sys
path = sys.argv[1]
with open(path) as f:
    data = json.load(f)
hooks = data.setdefault('hooks', {})
LOADER_MARKER = 'startup-check.sh'
PRECOMPACT_MARKER = 'PreCompact: flushing pending memory'

def already_present(entries, marker):
    return any(marker in json.dumps(e) for e in entries)

ss = hooks.setdefault('SessionStart', [])
if not already_present(ss, LOADER_MARKER):
    ss.append({'hooks': [{
        'type': 'command',
        'command': 'SESSION_CWD="$(pwd)" ~/.claude/startup-check.sh',
        'timeout': 10,
        'statusMessage': 'Loading memory...'
    }]})

pc = hooks.setdefault('PreCompact', [])
if not already_present(pc, PRECOMPACT_MARKER):
    pc.append({'hooks': [{
        'type': 'command',
        'command': "printf '%s' '{\"systemMessage\":\"PreCompact: flushing pending memory\",\"hookSpecificOutput\":{\"hookEventName\":\"PreCompact\",\"additionalContext\":\"PRE-COMPACT: Before this context compresses, write any pending session memory entries to .claude/memory/ per CLAUDE.md memory discipline. Do this NOW.\"}}'",
        'timeout': 5,
        'statusMessage': 'Flushing memory before compact...'
    }]})

poc = hooks.setdefault('PostCompact', [])
if not already_present(poc, LOADER_MARKER):
    poc.append({'hooks': [{
        'type': 'command',
        'command': 'SESSION_CWD="$(pwd)" ~/.claude/startup-check.sh',
        'timeout': 10,
        'statusMessage': 'Reloading memory after compaction...'
    }]})

with open(path, 'w') as f:
    json.dump(data, f, indent=2)
    f.write('\n')
PY
    ok "Memory hooks merged into $USER_SETTINGS"
  else
    warn "python3 not found - skipping settings.json hook merge."
    warn "Add SessionStart, PreCompact, PostCompact hooks manually using $REPO_DIR/claude/settings.json as a reference."
  fi
fi

# ============================================================
# 4. Anthropic Skills (additive, no config touched)
# ============================================================
# Skills install into ~/.claude/skills/ via the npx skills CLI. They do not
# replace or modify your CLAUDE.md, settings.json, hooks, or statusline -
# Claude Code reads skills from ~/.claude/skills/ regardless of whose
# config is active. Safe to install alongside an existing Claude Code setup.

if picked skills; then
  echo ""
  info "--- Anthropic Skills ---"
  if command -v npx >/dev/null 2>&1; then
    info "Installing make-interfaces-feel-better (tactical UI polish)..."
    # Note: --yes -g are flags for the skills CLI itself (auto-confirm + global
    # install), distinct from npx's own --yes (which auto-confirms package
    # download). Without --yes -g the skills CLI hangs on interactive prompts.
    if npx --yes skills add jakubkrehel/make-interfaces-feel-better --yes -g 2>/dev/null; then
      ok "make-interfaces-feel-better installed"
    else
      warn "Skill install failed (non-fatal). Run manually:"
      warn "  npx skills add jakubkrehel/make-interfaces-feel-better --yes -g"
    fi
  else
    warn "npx not found - skipping make-interfaces-feel-better (requires npx)."
    warn "After installing Node + Claude Code, run:"
    warn "  npx skills add jakubkrehel/make-interfaces-feel-better --yes -g"
  fi

  # Bundled skill: component-gallery-reference (shipped with dotfiles, no npx needed)
  info "Installing component-gallery-reference (UI component research via component.gallery)..."
  mkdir -p "$CLAUDE_DIR/skills/component-gallery-reference"
  cp "$REPO_DIR/claude/skills/component-gallery-reference/SKILL.md" \
     "$CLAUDE_DIR/skills/component-gallery-reference/SKILL.md"
  ok "component-gallery-reference installed"
fi

# ============================================================
# 5. Custom statusline
# ============================================================
# Symlinks our statusline-command.sh into ~/.claude/. The statusLine command
# in our settings.json is `[ -x SCRIPT ] && bash SCRIPT || true`, so if this
# component is unticked the test-x check fails, the OR clause keeps exit at
# 0, and Claude Code falls back to its default statusline cleanly.

if picked statusline; then
  echo ""
  info "--- Custom statusline ---"
  mkdir -p "$CLAUDE_DIR"
  make_symlink "$REPO_DIR/claude/statusline-command.sh" "$CLAUDE_DIR/statusline-command.sh"
  chmod +x "$REPO_DIR/claude/statusline-command.sh"
fi

# ============================================================
# 6. cmux config
# ============================================================

if picked cmux; then
  echo ""
  info "--- cmux ---"

  CMUX_CONFIG_DIR="$HOME/.config/cmux"
  mkdir -p "$CMUX_CONFIG_DIR"

  make_symlink "$REPO_DIR/cmux/settings.json" "$CMUX_CONFIG_DIR/settings.json"
fi

# ============================================================
# 7. Ghostty config (personal)
# ============================================================

if picked ghostty; then
  echo ""
  info "--- Ghostty ---"

  GHOSTTY_CONFIG_DIR="$HOME/Library/Application Support/com.mitchellh.ghostty"
  mkdir -p "$GHOSTTY_CONFIG_DIR"

  GHOSTTY_SOURCE="$REPO_DIR/ghostty/config.ghostty"
  GHOSTTY_TARGET="$GHOSTTY_CONFIG_DIR/config.ghostty"

  backup_if_exists "$GHOSTTY_TARGET"
  if [ -L "$GHOSTTY_TARGET" ]; then
    rm "$GHOSTTY_TARGET"
  fi
  # Substitute __DOTFILES_DIR__ with the actual repo path on this machine.
  # Lets the dotfiles be cloned anywhere - the deployed config gets absolute
  # paths baked in at install time.
  sed "s|__DOTFILES_DIR__|$REPO_DIR|g" "$GHOSTTY_SOURCE" > "$GHOSTTY_TARGET"
  ok "$GHOSTTY_TARGET (rendered from repo, paths -> $REPO_DIR)"

  if ! picked shaders; then
    warn "Ghostty config references shaders/*.glsl but you skipped the shaders component."
    warn "Ghostty will start fine; the shader chain just won't render."
  fi
fi

# ============================================================
# 8. Ghostty shaders (personal, community library + in-repo chain)
# ============================================================

if picked shaders; then
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

  # bettercrt.glsl, tft.glsl, and cursor_blaze.glsl live in this repo at
  # shaders/*.glsl and are loaded directly from there by Ghostty (see
  # config.ghostty). The ghostty-shaders clone is kept for the rest of the
  # community shader library.
fi

# ============================================================
# 9. Discord Chat Agent launcher (zsh only, idempotent)
# ============================================================

if picked discord; then
  echo ""
  info "--- Discord Chat Agent launcher ---"

  # Symlink Discord scripts
  for f in discord-chat-launcher.sh discord-onboard.sh discord-setup.sh; do
    if [ -f "$REPO_DIR/claude/$f" ]; then
      make_symlink "$REPO_DIR/claude/$f" "$CLAUDE_DIR/$f"
      chmod +x "$REPO_DIR/claude/$f"
    fi
  done

  DISCORD_LINE="source $CLAUDE_DIR/discord-chat-launcher.sh  # claude-dotfiles: discord-chat-launcher"

  if [ -f "$ZSHRC" ]; then
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
fi

# ============================================================
# 10. nvm default auto-activation (zsh only, idempotent)
# ============================================================
# Homebrew's nvm install sources nvm.sh but does NOT activate a default Node
# version. That leaves claude, node, npm, npx out of PATH in fresh shells, so
# the cmux claude wrapper errors with "claude not found in PATH". Append
# `nvm use default --silent` once, marker-guarded.

if picked nvm; then
  echo ""
  info "--- nvm default auto-activation ---"

  if [ -f "$ZSHRC" ]; then
    if grep -Fq "nvm use default" "$ZSHRC"; then
      ok "$ZSHRC (already auto-activates nvm default)"
    elif grep -Fq "nvm.sh" "$ZSHRC"; then
      printf '\n# Auto-activate nvm default so claude/node/npm are on PATH in new shells\nnvm use default --silent 2>/dev/null\n' >> "$ZSHRC"
      ok "Appended 'nvm use default' to $ZSHRC"
      warn "Run 'source $ZSHRC' or open a new shell to activate Node tooling."
    else
      warn "$ZSHRC does not source nvm.sh - skipping nvm default activation."
    fi
  else
    warn "$ZSHRC not found - skipping nvm default activation (zsh only)."
  fi
fi

# ============================================================
# 11. ampersand shell shortcut (zsh only, idempotent)
# ============================================================
# Defines one zsh function in the user's .zshrc:
#   ampersand          - cd into repo, re-launch installer (no pull)
#   ampersand --pull   - cd into repo, git pull, re-launch installer (sync + run)
# Forwards every other arg, so `ampersand --preset minimal` and
# `ampersand --pull --yes` work.
#
# Migration: detects and refreshes any older block format we ever shipped
# (pre-shortcuts vanity marker, combined yesplease+ampersand block, or the
# previous ampersand block that still carried a yesplease back-compat alias).
# All three get rewritten to the current ampersand-only block on next run.

if picked ampersand; then
  echo ""
  info "--- 'ampersand' shell shortcut ---"

  SHORTCUT_BEGIN="# === claude-dotfiles:shortcuts:begin ==="
  SHORTCUT_END="# === claude-dotfiles:shortcuts:end ==="
  LEGACY_VANITY_MARKER="# claude-dotfiles vanity command: pull latest and re-launch installer"

  append_shortcuts() {
    cat >> "$ZSHRC" <<EOF

$SHORTCUT_BEGIN
# 'ampersand' re-launches the installer. 'ampersand --pull' pulls latest first.
function ampersand() {
  local pull=0
  local args=()
  for arg in "\$@"; do
    case "\$arg" in
      --pull) pull=1 ;;
      *) args+=("\$arg") ;;
    esac
  done
  if [[ "\$pull" == "1" ]]; then
    ( cd "$REPO_DIR" && git pull --ff-only && ./install.sh "\${args[@]}" )
  else
    ( cd "$REPO_DIR" && ./install.sh "\${args[@]}" )
  fi
}
$SHORTCUT_END
EOF
  }

  # Block is current iff it has the SHORTCUT_BEGIN marker, has --pull in the
  # function body, AND does NOT carry the deprecated yesplease alias.
  is_current_format() {
    awk "/$SHORTCUT_BEGIN/,/$SHORTCUT_END/" "$ZSHRC" 2>/dev/null | grep -Fq -- "--pull" \
      && ! awk "/$SHORTCUT_BEGIN/,/$SHORTCUT_END/" "$ZSHRC" 2>/dev/null | grep -Fq "alias yesplease="
  }

  if [ -f "$ZSHRC" ]; then
    if grep -Fq "$SHORTCUT_BEGIN" "$ZSHRC" && is_current_format; then
      # Current format present. Check baked path.
      if grep -Fq "cd \"$REPO_DIR\"" "$ZSHRC"; then
        ok "$ZSHRC ('ampersand' already defined for $REPO_DIR)"
      else
        warn "Shortcut in $ZSHRC points at a different repo location. Refreshing to $REPO_DIR."
        sed -i.bak "/$SHORTCUT_BEGIN/,/$SHORTCUT_END/d" "$ZSHRC"
        rm -f "$ZSHRC.bak"
        append_shortcuts
        SHORTCUTS_NEW=1
        ok "Refreshed 'ampersand' in $ZSHRC -> $REPO_DIR"
      fi
    elif grep -Fq "$SHORTCUT_BEGIN" "$ZSHRC"; then
      # Older format with our marker (combined block, or current-with-deprecated-alias).
      # Sed-replace the whole range with the current format.
      sed -i.bak "/$SHORTCUT_BEGIN/,/$SHORTCUT_END/d" "$ZSHRC"
      rm -f "$ZSHRC.bak"
      append_shortcuts
      SHORTCUTS_NEW=1
      ok "Refreshed 'ampersand' in $ZSHRC (cleaned up legacy block)"
    elif grep -Fq "$LEGACY_VANITY_MARKER" "$ZSHRC"; then
      # Pre-marker format. Sed-replace through to the next standalone closing brace.
      sed -i.bak "/$LEGACY_VANITY_MARKER/,/^}$/d" "$ZSHRC"
      rm -f "$ZSHRC.bak"
      append_shortcuts
      SHORTCUTS_NEW=1
      ok "Migrated $ZSHRC to current 'ampersand' format"
    elif grep -Eq '^(function[[:space:]]+ampersand|alias[[:space:]]+ampersand=)' "$ZSHRC"; then
      warn "$ZSHRC already defines 'ampersand' without our marker - leaving it alone."
    else
      append_shortcuts
      SHORTCUTS_NEW=1
      ok "Added 'ampersand' shortcut to $ZSHRC"
    fi
  else
    warn "$ZSHRC not found - skipping shell shortcut (zsh only)."
  fi
fi

# ============================================================
# 12. Voice transcription (whisper.cpp + ffmpeg + transcribe CLI)
# ============================================================
# Local-only voice-to-text so Claude can answer Discord voice messages, iOS
# voice memos, or any other audio attachment dropped into a session. Three
# pieces:
#   1) Brew-install whisper-cpp and ffmpeg if missing (idempotent; brew is a
#      no-op when already installed).
#   2) Download ggml-base.en.bin (~150 MB) into ~/.cache/whisper/ if not
#      already there. base.en is the speed/accuracy sweet spot for English;
#      callers can override with WHISPER_MODEL=/path.
#   3) Symlink claude/transcribe.sh -> ~/.claude/transcribe so the canonical
#      invocation 'transcribe <file>' works from any cwd via absolute path.
# Non-fatal failures (no brew, network down) print warnings and move on so
# the installer doesn't block other components.

if picked voice; then
  echo ""
  info "--- Voice transcription ---"

  if command -v brew >/dev/null 2>&1; then
    if ! command -v whisper-cli >/dev/null 2>&1; then
      info "Installing whisper-cpp..."
      brew install whisper-cpp >/dev/null 2>&1 && ok "whisper-cpp installed" \
        || warn "brew install whisper-cpp failed (non-fatal). Run manually: brew install whisper-cpp"
    else
      ok "whisper-cpp already installed"
    fi
    if ! command -v ffmpeg >/dev/null 2>&1; then
      info "Installing ffmpeg..."
      brew install ffmpeg >/dev/null 2>&1 && ok "ffmpeg installed" \
        || warn "brew install ffmpeg failed (non-fatal). Run manually: brew install ffmpeg"
    else
      ok "ffmpeg already installed"
    fi
  else
    warn "Homebrew not found - cannot install whisper-cpp/ffmpeg automatically."
    warn "After installing Homebrew (https://brew.sh), run: brew install whisper-cpp ffmpeg"
  fi

  WHISPER_CACHE="$HOME/.cache/whisper"
  WHISPER_MODEL_FILE="$WHISPER_CACHE/ggml-base.en.bin"
  WHISPER_MODEL_URL="https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin"

  mkdir -p "$WHISPER_CACHE"
  if [ -f "$WHISPER_MODEL_FILE" ] && [ "$(stat -f%z "$WHISPER_MODEL_FILE" 2>/dev/null || stat -c%s "$WHISPER_MODEL_FILE" 2>/dev/null)" -gt 100000000 ]; then
    ok "Whisper model already at $WHISPER_MODEL_FILE"
  else
    info "Downloading ggml-base.en.bin (~150 MB) to $WHISPER_MODEL_FILE..."
    if curl -L -f --progress-bar "$WHISPER_MODEL_URL" -o "$WHISPER_MODEL_FILE.partial" \
       && mv "$WHISPER_MODEL_FILE.partial" "$WHISPER_MODEL_FILE"; then
      ok "Whisper model downloaded"
    else
      rm -f "$WHISPER_MODEL_FILE.partial"
      warn "Whisper model download failed (non-fatal). Retry manually:"
      warn "  curl -L $WHISPER_MODEL_URL -o $WHISPER_MODEL_FILE"
    fi
  fi

  mkdir -p "$CLAUDE_DIR"
  chmod +x "$REPO_DIR/claude/transcribe.sh"
  make_symlink "$REPO_DIR/claude/transcribe.sh" "$CLAUDE_DIR/transcribe"
fi

# ============================================================
# Summary
# ============================================================
# Suppress when invoked recursively from the returning-flow action loop -
# the parent flow shows its own brief result and returns to the menu.
# Wrap only the visual summary; the state-file write at the very end
# still runs in either case so the parent loop sees fresh state.
if [ -z "${_AMPERSAND_NO_SUMMARY:-}" ]; then

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
picked brain      && echo "  - Brain: team rules + workflow appended to CLAUDE.md (marker-guarded, additive)"
picked config     && echo "  - Config: hooks, plugins, permissions merged into settings.json (additive)"
picked memory     && echo "  - Memory subsystem: startup-check.sh + Memory Discipline section appended to CLAUDE.md + 3 hooks merged into settings.json (additive, marker-guarded)"
picked skills     && echo "  - Anthropic Skills: make-interfaces-feel-better (tactical UI polish; auto-triggers on UI work)"
picked statusline && echo "  - Custom statusline: statusline-command.sh symlinked (Claude Code falls back to default if unticked)"
picked ghostty  && echo "  - Ghostty: config.ghostty (copied from repo - re-run install.sh to sync edits)"
picked shaders  && echo "  - Ghostty shaders: in-repo chain at $REPO_DIR/shaders, plus library at ~/Documents/Github/ghostty-shaders"
picked cmux     && echo "  - cmux: settings.json"
picked discord  && echo "  - .zshrc: smart discord-chat-launcher (cold/mid/warm prompt at 'claude' launch). Onboarding walkthrough at ~/.claude/discord-onboard.sh."
picked nvm      && echo "  - .zshrc: nvm default auto-activation"
picked ampersand && echo "  - .zshrc: 'ampersand' shortcut (type 'ampersand' to re-run installer; 'ampersand --pull' to sync first)"
picked voice    && echo "  - Voice: whisper-cpp + ffmpeg + ggml-base.en model + ~/.claude/transcribe symlink (run '~/.claude/transcribe path/to/audio.ogg')"
echo ""
# Resolve which post-install guidance is actually relevant based on picks.
NEED_CC=0; NEED_PLUGINS=0; NEED_FONT=0
NEED_GHOSTTY_RESTART=0; NEED_CMUX_RESTART=0; NEED_SHELL_RELOAD=0
picked config    && { NEED_CC=1; NEED_PLUGINS=1; }
picked memory    && NEED_CC=1
picked skills    && NEED_CC=1
picked ghostty   && { NEED_FONT=1; NEED_GHOSTTY_RESTART=1; }
picked cmux      && NEED_CMUX_RESTART=1
picked discord   && NEED_SHELL_RELOAD=1
picked nvm       && NEED_SHELL_RELOAD=1
# Suppress the generic "source .zshrc" bullet when the prominent shortcut box
# is firing - that box covers the same instruction more visibly.
[ "$SHORTCUTS_NEW" -eq 0 ] && picked ampersand && NEED_SHELL_RELOAD=1

# Render Manual Steps only if at least one bullet would fire.
TOTAL_STEPS=$((NEED_CC + NEED_PLUGINS + NEED_FONT + NEED_GHOSTTY_RESTART + NEED_CMUX_RESTART + NEED_SHELL_RELOAD))
if [ "$TOTAL_STEPS" -gt 0 ]; then
  echo "Manual steps remaining:"
  STEP=0
  if [ "$NEED_CC" -eq 1 ]; then
    STEP=$((STEP+1))
    echo "  $STEP. Install Claude Code if not already present:"
    echo "      npm install -g @anthropic-ai/claude-code"
  fi
  if [ "$NEED_PLUGINS" -eq 1 ]; then
    STEP=$((STEP+1))
    echo "  $STEP. Open Claude Code once - your enabled plugins (Impeccable, Figma,"
    echo "      Sentry, Supabase, Discord, hookify, superpowers, etc.) auto-install"
    echo "      from settings.json on first launch. Run 'claude /plugins' to confirm."
  fi
  if [ "$NEED_FONT" -eq 1 ]; then
    STEP=$((STEP+1))
    echo "  $STEP. Install the PolySans Neutral Mono font family (used by Ghostty config)."
  fi
  if [ "$NEED_GHOSTTY_RESTART" -eq 1 ] && [ "$NEED_CMUX_RESTART" -eq 1 ]; then
    STEP=$((STEP+1))
    echo "  $STEP. Restart Ghostty and cmux to pick up config changes."
  elif [ "$NEED_GHOSTTY_RESTART" -eq 1 ]; then
    STEP=$((STEP+1))
    echo "  $STEP. Restart Ghostty to pick up config changes."
  elif [ "$NEED_CMUX_RESTART" -eq 1 ]; then
    STEP=$((STEP+1))
    echo "  $STEP. Restart cmux to pick up config changes."
  fi
  if [ "$NEED_SHELL_RELOAD" -eq 1 ]; then
    STEP=$((STEP+1))
    echo "  $STEP. Open a new shell or 'source ~/.zshrc' to activate the .zshrc additions."
  fi
  echo ""
fi

# Connectors and MCP servers - only relevant if Claude Code is in play.
if [ "$NEED_CC" -eq 1 ]; then
  echo "Connectors and MCP servers (NOT installed by this script - per-account):"
  echo "  - ClickUp: a Claude.ai connector. Sign in at claude.ai, go to"
  echo "    Settings -> Connectors, and authorize ClickUp once. It then works"
  echo "    in every Claude session signed in to that account."
  echo "  - Claude in Chrome: a Chrome extension. Install from the Chrome Web"
  echo "    Store, sign in to Claude, and it bridges to Claude Code automatically."
  echo "  These aren't portable through dotfiles because they need OAuth and"
  echo "  per-browser setup. Set them up once per machine."
  echo ""
fi

# Impeccable workflow - only relevant when our settings.json (with the
# impeccable plugin enabled) is active, i.e., config was picked.
if picked config; then
  echo "Design workflow (Impeccable):"
  echo "  - The impeccable plugin is enabled in settings.json (autoUpdate on)."
  echo "  - CLAUDE.md routes all design and UI-QA work through /impeccable."
  echo "  - In each new project, run '/impeccable teach' once to seed PRODUCT.md"
  echo "    and optionally DESIGN.md at the project root. Every /impeccable command"
  echo "    reads those files, so skipping this step produces generic output."
  echo "  - Run '/impeccable' with no argument to see the full 23-command menu."
  echo ""
fi

# ============================================================
# Final callout: shortcut-block was newly written this run
# ============================================================
# zsh only reads .zshrc at shell startup, so a function appended during
# install.sh isn't live in the parent shell yet. Print a prominent box
# so a new user knows to source.zshrc once before typing `ampersand`.

if [ "$SHORTCUTS_NEW" -eq 1 ]; then
  echo ""
  if command -v gum >/dev/null 2>&1; then
    gum style --border double --margin "1 0" --padding "1 2" --border-foreground "#0e7490" \
      "ONE MORE STEP" \
      "" \
      "The 'ampersand' shortcut was just added to ~/.zshrc," \
      "but your current shell hasn't loaded it yet." \
      "" \
      "Run this now to use it in this terminal:" \
      "    source ~/.zshrc" \
      "" \
      "Or open a new terminal window. After that, type 'ampersand' from" \
      "anywhere to re-launch the installer."
  else
    ACCENT_COLOR='\033[38;2;14;116;144m'
    NC='\033[0m'
    printf "${ACCENT_COLOR}╔══════════════════════════════════════════════════════════════════╗${NC}\n"
    printf "${ACCENT_COLOR}║${NC}  ONE MORE STEP                                                   ${ACCENT_COLOR}║${NC}\n"
    printf "${ACCENT_COLOR}║${NC}                                                                  ${ACCENT_COLOR}║${NC}\n"
    printf "${ACCENT_COLOR}║${NC}  'ampersand' was just added to ~/.zshrc, but your current        ${ACCENT_COLOR}║${NC}\n"
    printf "${ACCENT_COLOR}║${NC}  shell hasn't loaded it yet.                                     ${ACCENT_COLOR}║${NC}\n"
    printf "${ACCENT_COLOR}║${NC}                                                                  ${ACCENT_COLOR}║${NC}\n"
    printf "${ACCENT_COLOR}║${NC}  Run this now to use it in this terminal:                        ${ACCENT_COLOR}║${NC}\n"
    printf "${ACCENT_COLOR}║${NC}      source ~/.zshrc                                             ${ACCENT_COLOR}║${NC}\n"
    printf "${ACCENT_COLOR}║${NC}                                                                  ${ACCENT_COLOR}║${NC}\n"
    printf "${ACCENT_COLOR}║${NC}  Or open a new terminal window. After that, 'ampersand'          ${ACCENT_COLOR}║${NC}\n"
    printf "${ACCENT_COLOR}║${NC}  works from any directory.                                       ${ACCENT_COLOR}║${NC}\n"
    printf "${ACCENT_COLOR}╚══════════════════════════════════════════════════════════════════╝${NC}\n"
  fi
  echo ""
fi

fi  # end if [ -z "$_AMPERSAND_NO_SUMMARY" ]

# ============================================================
# Final: update state file with what's now active.
# ============================================================
# Persist per-component status so future runs know it's a returning user
# and can show accurate active/inactive/not-installed states.

state_init_if_missing
for k in "${KEYS[@]}"; do
  s=$(detect_component "$k")
  state_set "$k" "$s"
done
state_record_sha
