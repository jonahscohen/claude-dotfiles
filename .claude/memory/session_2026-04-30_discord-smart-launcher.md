---
name: Smart Discord launcher + onboarding walkthrough (cold/mid/warm states)
description: Reworked discord-chat-launcher.sh into a state-aware prompt that detects whether a bot is configured and whether anyone is paired, and added discord-onboard.sh as an interactive walkthrough so colleagues (not just Jonah) can configure Discord from scratch. Also moved the discord component from PERSONAL_KEYS to public KEYS so the smart launcher ships by default.
type: project
---

Collaborator: Jonah Cohen

# What changed

Three pieces of work, intended to make the Discord chat agent self-onboarding for any colleague who installs the dotfiles:

1. `claude/discord-chat-launcher.sh` rewritten as a 3-state prompt. The 25-line "always ask y/n" prompt is gone; the new version checks Keychain for the bot token and `access.json` for paired users, then routes:
   - **Cold** (no token): `[s] Set up now / [k] Skip / [n] Never ask again`. Choosing `s` runs `~/.claude/discord-onboard.sh`. Choosing `n` writes a `~/.claude/channels/discord/.skip-launcher` marker so the prompt never appears again on this machine (delete the file to undo).
   - **Mid** (token but no `allowFrom` entries): `[p] Pair now / [s] Skip`. Choosing `p` launches Claude with the Discord channel attached so the user can DM the bot.
   - **Warm** (token + paired): identical to the previous behavior - 5-second `Connect to Discord Chat Agent? (y/n)` with default Yes.

2. `claude/discord-onboard.sh` (new, ~210 lines). Interactive walkthrough with `--status` mode for state inspection. Two branches at the picker:
   - **Branch 1** "I already have a bot": single hidden-input token paste, calls `discord-setup.sh` to land in macOS Keychain.
   - **Branch 2** "Walk me through making a new one": seven numbered Developer Portal steps (create application -> Bot tab -> Message Content Intent -> Reset Token -> OAuth2 URL Generator with bot scope + send/read perms -> authorize), each gated on `Press enter when done`, then the same hidden-input token paste.
   
   Both branches end with the same `print_pairing_instructions()` block: "open a new terminal, type `claude`, DM the bot, then `/discord:access pair <code>` with the 6-character code the bot replies with." Also nudges the user toward `ampersand --only voice` for voice-message support.

3. `discord` promoted from `PERSONAL_KEYS` to public `KEYS` in `install.sh`. Description rewritten to reflect the smart prompt. `PERSONAL_KEYS` now holds only `ghostty` and `shaders`. `PICKS` and `PERSONAL_PICKS` adjusted accordingly. `claude` install block now also symlinks `discord-onboard.sh` and `discord-setup.sh` into `~/.claude/`.

# Why

User asked: "change how the Discord check at Claude session start works - if the user has previously paired a bot to their Discord plugin, then great. If not, have the Discord check onboard the user [...] I don't want this to be built just for me. If my colleagues want to configure voice on their end, they should be shown how."

Two distinct requirements:
- Smart prompt: don't bother users who don't want Discord; help users who do.
- Generality: the flow has to work for colleagues, not Jonah's setup specifically.

The previous launcher always asked "Connect to Discord Chat Agent? (y/n)" regardless of whether a bot existed. A new user with no bot would say Yes, get an error, and have no path forward. The state-aware version handles each state with the appropriate next step.

Making `discord` public (not personal-only) follows the spirit of "not built just for me." A colleague who installs the whole-package dotfiles now gets the source line in their `.zshrc`; the smart launcher then degrades cleanly to "Set up now / Skip / Never ask" so non-Discord users aren't pushed.

# How

## State detection helpers (shared between launcher and onboarder)

```zsh
_claude_has_discord_token() {
  security find-generic-password -s claude-discord-bot -a "$USER" -w >/dev/null 2>&1
}
_claude_has_discord_pair() {
  [ -f "$ACCESS_FILE" ] || return 1
  if command -v jq >/dev/null 2>&1; then
    [ "$(jq -r '.allowFrom | length' "$ACCESS_FILE" 2>/dev/null || echo 0)" -gt 0 ]
  else
    grep -Eq '"allowFrom"[[:space:]]*:[[:space:]]*\[[[:space:]]*"' "$ACCESS_FILE"
  fi
}
```

The jq fallback to grep matters: `jq` isn't a pinned dotfiles dep. The grep regex matches `"allowFrom":["..."` (any non-empty array), which is the documented schema shape.

## Skip-launcher opt-out

When the user picks `[n] Never ask again`, the launcher creates an empty `~/.claude/channels/discord/.skip-launcher` marker. The launcher checks for this marker first, before any state probe. Removing the file re-enables the prompt - no config edit, no installer rerun.

## install.sh diffs

- `KEYS=(... ampersand voice discord)` (was 8, now 9 public components)
- `PERSONAL_KEYS=(ghostty shaders)` (was 3 with discord, now 2)
- New TITLES/DESCS/PICKS entries for discord at index 8
- Help text and component-count comment updated (8 -> 9)
- `claude` install block adds two new symlinks: `discord-onboard.sh` and `discord-setup.sh`
- "What was installed" summary line for `discord` now mentions the smart prompt
- "What was installed" summary line for `claude` now lists the two new files

# Verification

- `bash -n install.sh` exits 0
- `zsh -n discord-chat-launcher.sh` exits 0
- `bash -n discord-onboard.sh` exits 0
- `./install.sh --dry-run --yes` lists 9 components, all ticked
- `./install.sh --personal --dry-run --yes` lists 11 (9 public + 2 personal)
- `./install.sh --only claude` re-runs cleanly; new symlinks `~/.claude/discord-onboard.sh` and `~/.claude/discord-setup.sh` appear and resolve to the repo
- `~/.claude/discord-onboard.sh --status` prints `bot configured, at least one user paired (warm)` (matches current real state)
- `~/.claude/discord-onboard.sh` (interactive, no input) lands on the warm-state confirmation block (correct since current state is warm)
- State-detection helpers verified in three subshell mocks: cold (fake service name + empty access.json -> no/no), mid (real token + empty allowFrom -> yes/no), warm (real token + populated allowFrom -> yes/yes)

# Files touched

- `claude/discord-chat-launcher.sh` (full rewrite, 25 -> 95 lines)
- `claude/discord-onboard.sh` (new, ~210 lines)
- `claude/CLAUDE.md` (new "Discord Chat Agent (smart launcher + onboarding)" section after "Voice transcription")
- `install.sh` (KEYS arrays, PERSONAL split, --help, two new symlinks in claude block, summary lines)
- `.claude/memory/session_2026-04-30_discord-smart-launcher.md` (this file)
- `.claude/memory/MEMORY.md` (index entry)

# Open knowns

- The launcher's `Press enter when done` style assumes the user can read a terminal during the walkthrough. For pair-programming setups where the terminal is hidden behind another app, the steps still work but the user has to alt-tab. Acceptable for now.
- `discord-onboard.sh`'s "Walk me through a new one" branch hardcodes Discord Developer Portal UI text. If Discord renames things ("Bot" -> "Bot Settings", etc.), the script will go stale. Mitigation: re-run `--status` checks the actual state, so a stale step description that lands the user at the wrong button still produces a clear "no token" outcome on next invocation.
- Promoting `discord` to public means existing-user installs will start adding a source line to `.zshrc` even on machines where they didn't want it. The smart launcher handles this gracefully (cold state offers `[n] Never ask`), but it's a small behavior change worth flagging in any release notes if this becomes a Yes&-team rollout.
