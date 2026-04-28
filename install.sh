#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# claude-dotfiles installer
# Interactive TUI over six components:
#   claude   - Claude Code global config (CLAUDE.md, settings.json, hooks, statusline, memory)
#   ghostty  - Ghostty terminal config (copied into Application Support)
#   shaders  - Ghostty shaders: in-repo chain + community library clone
#   cmux     - cmux settings.json
#   discord  - .zshrc source line for discord-chat-launcher
#   nvm      - .zshrc auto-activate of nvm default (so claude/node/npm land on PATH)
#
# Flags:
#   --yes              non-interactive, pick all components
#   --only KEYS        non-interactive, pick comma-separated keys (e.g. claude,ghostty)
#   --preset NAME      non-interactive preset: all | minimal | none
#                      minimal = claude + nvm
#   --dry-run          print picks and exit; touches no files
#   --help             print usage
#
# Idempotent. Safe to re-run.
# ============================================================

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="$REPO_DIR/.backups/$(date +%Y%m%d-%H%M%S)"
BACKED_UP=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
DIM='\033[2m'
NC='\033[0m'

info()  { printf "${CYAN}[info]${NC}  %s\n" "$1"; }
ok()    { printf "${GREEN}[ok]${NC}    %s\n" "$1"; }
warn()  { printf "${YELLOW}[warn]${NC}  %s\n" "$1"; }
err()   { printf "${RED}[error]${NC} %s\n" "$1"; }

# ============================================================
# Component catalogue (parallel arrays for bash 3.2 compatibility)
# ============================================================

KEYS=(claude memory skills statusline ghostty shaders cmux discord nvm yesplease)
TITLES=(
  "Claude Code config (REPLACES existing)"
  "Memory subsystem (additive: hooks + rules + loader)"
  "Anthropic Skills (additive, safe alongside existing setup)"
  "Custom statusline (bottom-of-window prompt bar)"
  "Ghostty terminal look"
  "Ghostty visual effects (shaders)"
  "cmux split-pane terminal"
  "Discord chat at Claude launch"
  "nvm fix (optional, only if needed)"
  "'yesplease' shortcut (re-run installer)"
)
DESCS=(
  "Your global Claude Code brain: REPLACES ~/.claude/CLAUDE.md, settings.json (with our plugin list - Impeccable, Figma, Sentry, Supabase, Discord, plus 9 more), safety hooks, and shared memory files. Existing files are backed up to .backups/ but the active versions become ours. Skip if you already have your own CLAUDE.md and settings.json that you want to keep - then pick 'memory' and 'skills' alone to add memory capability and UI-polish capability without touching your config. (Plugin-list merging into an existing settings.json is a TODO; for now you'd manually copy enabledPlugins from claude/settings.json into yours.)"
  "ADDITIVE memory subsystem: appends our Memory Discipline rules (loading order, per-task updates, file format) to your CLAUDE.md between marker comments, JSON-merges three hooks (SessionStart loader, PreCompact reminder, PostCompact reload) into your settings.json, and symlinks the startup-check.sh loader. Does NOT replace or overwrite anything - all changes are marker-guarded so re-runs are no-ops, and the markers can be removed cleanly if you ever want to undo. Pick this if your team wants to beef up an existing Claude Code with persistent memory capability without losing their config."
  "Adds Anthropic Skills to ~/.claude/skills/ via npx, fully additive. Currently bundles make-interfaces-feel-better (tactical UI polish: concentric border radius, scale 0.96 on press, tabular nums, optical alignment, auto-triggers on UI keywords). Does NOT touch your CLAUDE.md, settings.json, hooks, or statusline. Safe to pick standalone if you have your own Claude Code config and just want the skill capability."
  "Symlinks our statusline-command.sh into ~/.claude/. The settings.json statusLine command is tolerant of a missing script, so unticking this cleanly falls back to no custom statusline (Claude Code's default takes over). Pick this if you like our prompt-bar render; skip if you prefer Claude Code's default or a different statusline you've configured yourself."
  "Your Ghostty terminal's appearance: PolySans Neutral Mono font, custom 256-color palette, transparency, and blur. Skip if you don't use Ghostty as your terminal."
  "The cinematic Ghostty effects: CRT curvature, TFT pixel grid, and a blazing cursor trail. Also clones a wider community shader library you can swap into the chain. Skip if you picked Ghostty but want it to look plain."
  "Settings for cmux, the split-pane terminal that hosts the in-app browser preview Claude uses to verify your UI work. Skip if you don't use cmux."
  "Adds a one-line wrapper to your zsh config so when you run 'claude', it asks if you want to connect this session to your Discord channel. Skip if you don't pair Claude with Discord."
  "A small one-line addition to your zsh config that fixes a specific issue some setups hit: opening a new terminal and getting 'claude not found in PATH' even though Claude is installed. The fix only activates if your zsh config already loads nvm (Node Version Manager) - on most machines this is a harmless no-op, so it's safe to leave on. If 'claude' already runs fine in fresh terminals on your machine, you can skip this."
  "Adds a one-word shortcut to your zsh config: type 'yesplease' in any terminal to pull the latest dotfiles from GitHub and re-launch this installer. Useful for syncing across machines or re-picking components without remembering the path. Pass through args like 'yesplease --yes' or 'yesplease --preset minimal'."
)
PICKS=(1 1 1 1 1 1 1 1 1 1)

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
    minimal) set_all 0; set_pick claude 1; set_pick memory 1; set_pick skills 1; set_pick nvm 1 ;;
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
                                (claude, memory, skills, statusline, ghostty, shaders, cmux, discord, nvm, yesplease)
  ./install.sh --dry-run        Print resolved picks and exit
  ./install.sh --help           Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes|-y)       NONINTERACTIVE=1; set_all 1; shift ;;
    --only)         NONINTERACTIVE=1; apply_only "${2:-}"; shift 2 ;;
    --preset)       NONINTERACTIVE=1; apply_preset "${2:-}"; shift 2 ;;
    --dry-run|-n)   DRY_RUN=1; shift ;;
    --help|-h)      print_help; exit 0 ;;
    *)              err "Unknown flag: $1"; print_help; exit 2 ;;
  esac
done

# ============================================================
# Pre-flight
# ============================================================

if [[ "$(uname)" != "Darwin" ]]; then
  err "This installer is built for macOS. Linux support would need different paths."
  err "Ghostty config: ~/.config/ghostty/config instead of ~/Library/Application Support/"
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
  printf "\n${CYAN}Selected components${NC}\n"
  local i mark
  for i in "${!KEYS[@]}"; do
    if [[ "${PICKS[$i]}" == "1" ]]; then mark="${GREEN}[x]${NC}"; else mark="${DIM}[ ]${NC}"; fi
    printf "  %b %-9s ${DIM}%s${NC}\n" "$mark" "${KEYS[$i]}" "${TITLES[$i]}"
  done
  printf "\n"
}

# Print a string with a one-shot shimmer reveal that settles into a static
# purple-to-periwinkle gradient. Replaces `gum style --foreground 212` for
# component titles in the TUI. Endpoints: deep violet (#7c3aed = 124,58,237)
# -> periwinkle (#a5b4fc = 165,180,252), with a brighter shimmer band
# (#e0e7ff = 224,231,255) that sweeps left-to-right once.
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
      r=$(( 124 + (165 - 124) * i / divisor ))
      g=$(( 58  + (180 -  58) * i / divisor ))
      b=$(( 237 + (252 - 237) * i / divisor ))
      d=$(( i - pos ))
      [ "$d" -lt 0 ] && d=$(( -d ))
      if [ "$d" -lt "$shimmer_width" ]; then
        intensity=$(( (shimmer_width - d) * 100 / shimmer_width ))
        r=$(( r + (224 - r) * intensity / 100 ))
        g=$(( g + (231 - g) * intensity / 100 ))
        b=$(( b + (255 - b) * intensity / 100 ))
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
    r=$(( 124 + (165 - 124) * i / divisor ))
    g=$(( 58  + (180 -  58) * i / divisor ))
    b=$(( 237 + (252 - 237) * i / divisor ))
    printf '\033[38;2;%d;%d;%dm%s' "$r" "$g" "$b" "$char"
  done
  printf '\033[0m\n'
}

run_tui_gum() {
  gum style --border double --margin "1 0" --padding "1 2" --border-foreground "#7c3aed" \
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
        --cursor.foreground "#a5b4fc" \
        --selected.foreground "#a5b4fc" \
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

  show_picks_summary
  gum confirm "Proceed with these components?" || return 1
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

if [[ "$NONINTERACTIVE" == "0" ]]; then
  if ensure_gum; then
    run_tui_gum || { warn "Aborted at confirmation."; exit 0; }
  else
    run_tui_fallback || { warn "Aborted at confirmation."; exit 0; }
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
# 1. Claude Code config
# ============================================================

if picked claude; then
  echo ""
  info "--- Claude Code ---"
  mkdir -p "$CLAUDE_DIR/memory"
  mkdir -p "$CLAUDE_DIR/hooks"

  make_symlink "$REPO_DIR/claude/CLAUDE.md"                 "$CLAUDE_DIR/CLAUDE.md"
  make_symlink "$REPO_DIR/claude/settings.json"             "$CLAUDE_DIR/settings.json"
  make_symlink "$REPO_DIR/claude/startup-check.sh"          "$CLAUDE_DIR/startup-check.sh"
  make_symlink "$REPO_DIR/claude/discord-chat-launcher.sh"  "$CLAUDE_DIR/discord-chat-launcher.sh"

  for f in "$REPO_DIR"/claude/memory/*.md; do
    [ -f "$f" ] || continue
    make_symlink "$f" "$CLAUDE_DIR/memory/$(basename "$f")"
  done

  for f in "$REPO_DIR"/claude/hooks/*.sh; do
    [ -f "$f" ] || continue
    make_symlink "$f" "$CLAUDE_DIR/hooks/$(basename "$f")"
    chmod +x "$f"
  done

  chmod +x "$REPO_DIR/claude/startup-check.sh"
  chmod +x "$REPO_DIR/claude/discord-chat-launcher.sh"
fi

# ============================================================
# 2. Memory subsystem (additive: rules + hooks + loader)
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
    # Extract the marker-bounded block from our CLAUDE.md (inclusive of markers).
    awk "/$MEMORY_BEGIN_MARKER/,/$MEMORY_END_MARKER/" "$REPO_DIR/claude/CLAUDE.md" \
      | { printf '\n'; cat; } >> "$USER_CLAUDE_MD"
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
# 3. Anthropic Skills (additive, no config touched)
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
    if npx --yes skills add jakubkrehel/make-interfaces-feel-better 2>/dev/null; then
      ok "make-interfaces-feel-better installed"
    else
      warn "Skill install failed (non-fatal). Run manually:"
      warn "  npx skills add jakubkrehel/make-interfaces-feel-better"
    fi
  else
    warn "npx not found - skipping skill install."
    warn "After installing Node + Claude Code, run:"
    warn "  npx skills add jakubkrehel/make-interfaces-feel-better"
  fi
fi

# ============================================================
# 4. Custom statusline
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
# 5. Ghostty shaders (community library + in-repo chain)
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
# 6. Ghostty config
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
# 7. cmux config
# ============================================================

if picked cmux; then
  echo ""
  info "--- cmux ---"

  CMUX_CONFIG_DIR="$HOME/.config/cmux"
  mkdir -p "$CMUX_CONFIG_DIR"

  make_symlink "$REPO_DIR/cmux/settings.json" "$CMUX_CONFIG_DIR/settings.json"
fi

# ============================================================
# 8. Discord Chat Agent launcher (zsh only, idempotent)
# ============================================================

if picked discord; then
  echo ""
  info "--- Discord Chat Agent launcher ---"

  DISCORD_LINE="source $CLAUDE_DIR/discord-chat-launcher.sh  # claude-dotfiles: discord-chat-launcher"

  if [ -f "$ZSHRC" ]; then
    if grep -Fq "discord-chat-launcher.sh" "$ZSHRC"; then
      ok "$ZSHRC (already sources discord-chat-launcher.sh)"
    else
      printf '\n# Discord Chat Agent launcher (from claude-dotfiles)\n%s\n' "$DISCORD_LINE" >> "$ZSHRC"
      ok "Appended discord-chat-launcher source line to $ZSHRC"
      warn "Run 'source $ZSHRC' or open a new shell to pick up the wrapper."
    fi
    if ! picked claude; then
      warn "discord launcher source line points to ~/.claude/discord-chat-launcher.sh, but the claude component is unselected."
      warn "Run with --only claude or re-run with claude picked to install the file the line sources."
    fi
  else
    warn "$ZSHRC not found - skipping discord-chat-launcher source line (zsh only)."
  fi
fi

# ============================================================
# 9. nvm default auto-activation (zsh only, idempotent)
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
# 10. yesplease vanity shortcut (zsh only, idempotent)
# ============================================================
# Defines a zsh function `yesplease` that cd's into the dotfiles repo, pulls
# latest, and re-launches install.sh. Forwards any args, so you can do
# `yesplease --preset minimal` or `yesplease --yes`.

if picked yesplease; then
  echo ""
  info "--- yesplease shortcut ---"

  YESPLEASE_MARKER="# claude-dotfiles vanity command: pull latest and re-launch installer"

  if [ -f "$ZSHRC" ]; then
    if grep -Fq "$YESPLEASE_MARKER" "$ZSHRC"; then
      # Our marker is present. Check whether the baked path still matches REPO_DIR.
      if grep -Fq "cd \"$REPO_DIR\"" "$ZSHRC"; then
        ok "$ZSHRC (already defines 'yesplease' for $REPO_DIR)"
      else
        warn "'yesplease' in $ZSHRC points at a different repo location. Refreshing to $REPO_DIR."
        # Strip the existing marker comment + function block, then append fresh.
        # Range: from marker line through the next standalone closing brace.
        sed -i.bak "/$YESPLEASE_MARKER/,/^}$/d" "$ZSHRC"
        rm -f "$ZSHRC.bak"
        cat >> "$ZSHRC" <<EOF

$YESPLEASE_MARKER
function yesplease() {
  ( cd "$REPO_DIR" && git pull --ff-only && ./install.sh "\$@" )
}
EOF
        ok "Refreshed 'yesplease' in $ZSHRC -> $REPO_DIR"
        warn "Run 'source $ZSHRC' or open a new shell to pick up the new path."
      fi
    elif grep -Eq '^(function[[:space:]]+yesplease|alias[[:space:]]+yesplease=)' "$ZSHRC"; then
      # Some other yesplease (manually defined, no marker). Don't touch it.
      warn "$ZSHRC already defines 'yesplease' without our marker - leaving it alone."
    else
      cat >> "$ZSHRC" <<EOF

$YESPLEASE_MARKER
function yesplease() {
  ( cd "$REPO_DIR" && git pull --ff-only && ./install.sh "\$@" )
}
EOF
      ok "Added 'yesplease' function to $ZSHRC"
      warn "Run 'source $ZSHRC' or open a new shell to use 'yesplease'."
    fi
  else
    warn "$ZSHRC not found - skipping yesplease shortcut (zsh only)."
  fi
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
picked claude     && echo "  - Claude Code: CLAUDE.md, settings.json, hooks, memory, discord-chat-launcher (REPLACED any existing files; backed up to .backups/)"
picked memory     && echo "  - Memory subsystem: startup-check.sh + Memory Discipline section appended to CLAUDE.md + 3 hooks merged into settings.json (additive, marker-guarded)"
picked skills     && echo "  - Anthropic Skills: make-interfaces-feel-better (tactical UI polish; auto-triggers on UI work)"
picked statusline && echo "  - Custom statusline: statusline-command.sh symlinked (Claude Code falls back to default if unticked)"
picked ghostty  && echo "  - Ghostty: config.ghostty (copied from repo - re-run install.sh to sync edits)"
picked shaders  && echo "  - Ghostty shaders: in-repo chain at $REPO_DIR/shaders, plus library at ~/Documents/Github/ghostty-shaders"
picked cmux     && echo "  - cmux: settings.json"
picked discord  && echo "  - .zshrc: source line for discord-chat-launcher (added once, marker-guarded)"
picked nvm      && echo "  - .zshrc: nvm default auto-activation"
picked yesplease && echo "  - .zshrc: 'yesplease' shortcut (type 'yesplease' to re-run installer)"
echo ""
echo "Manual steps remaining:"
echo "  1. Install Claude Code if not already present:"
echo "     npm install -g @anthropic-ai/claude-code"
echo "  2. Open Claude Code once - your enabled plugins (Impeccable, Figma,"
echo "     Sentry, Supabase, Discord, hookify, superpowers, etc.) auto-install"
echo "     from settings.json on first launch. Run 'claude /plugins' to confirm."
echo "  3. Install the PolySans Neutral Mono font family (used by Ghostty config)."
echo "  4. Restart Ghostty and cmux to pick up config changes."
echo "  5. Open a new shell or 'source ~/.zshrc' to activate the .zshrc additions."
echo ""
echo "Connectors and MCP servers (NOT installed by this script - per-account):"
echo "  - ClickUp: a Claude.ai connector. Sign in at claude.ai, go to"
echo "    Settings -> Connectors, and authorize ClickUp once. It then works"
echo "    in every Claude session signed in to that account."
echo "  - Claude in Chrome: a Chrome extension. Install from the Chrome Web"
echo "    Store, sign in to Claude, and it bridges to Claude Code automatically."
echo "  These aren't portable through dotfiles because they need OAuth and"
echo "  per-browser setup. Set them up once per machine."
echo ""
echo "Design workflow (Impeccable):"
echo "  - The impeccable plugin is enabled in settings.json (autoUpdate on)."
echo "  - CLAUDE.md routes all design and UI-QA work through /impeccable."
echo "  - In each new project, run '/impeccable teach' once to seed PRODUCT.md"
echo "    and optionally DESIGN.md at the project root. Every /impeccable command"
echo "    reads those files, so skipping this step produces generic output."
echo "  - Run '/impeccable' with no argument to see the full 23-command menu."
echo ""
