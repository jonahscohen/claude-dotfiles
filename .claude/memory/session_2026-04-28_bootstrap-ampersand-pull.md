---
name: Bootstrap minimal-mode + collapse yesplease into 'ampersand --pull'
description: Bootstrap.sh now installs ONLY the ampersand shortcut by default, prints "Unpacking installer...complete." and exits, leaving the user to type `ampersand` to launch the picker. The yesplease function is replaced by `ampersand --pull` for the same behavior. yesplease is kept as a back-compat alias.
type: project
---

Collaborator: Jonah Cohen

# What changed

## bootstrap.sh - new default behavior

Was: clone repo, re-exec install.sh with all args (auto-launching the TUI).

Now: clone repo, run `install.sh --only ampersand --yes` silently to install just the shortcut, print "Unpacking installer...complete." then "Type 'ampersand' to begin." and exit.

If args were passed (`bash -s -- --yes`, `--preset minimal`, etc.), still re-exec install.sh with those args after the shortcut install. So power users running `curl|bash -s -- --yes` get the full automated install; new users running `curl|bash` get the minimal welcome flow.

Used a `HAS_INSTALLER_ARGS` flag instead of checking `${#INSTALLER_ARGS[@]}` directly because bash 3.2 chokes on empty-array expansion under `set -u`.

## install.sh - component renamed yesplease -> ampersand

The KEY for the shortcut component is now `ampersand` (was `yesplease`). The function appended to `.zshrc` is now a single `ampersand()` with `--pull` flag handling, plus a `yesplease='ampersand --pull'` alias for back-compat.

```zsh
function ampersand() {
  local pull=0
  local args=()
  for arg in "$@"; do
    case "$arg" in
      --pull) pull=1 ;;
      *) args+=("$arg") ;;
    esac
  done
  if [[ "$pull" == "1" ]]; then
    ( cd "$REPO_DIR" && git pull --ff-only && ./install.sh "${args[@]}" )
  else
    ( cd "$REPO_DIR" && ./install.sh "${args[@]}" )
  fi
}
alias yesplease='ampersand --pull'
```

Migration logic now handles three previous formats:
1. **New ampersand-only with --pull** (this format): no-op or path-drift refresh.
2. **Old combined yesplease+ampersand block** (the `--pull`-less SHORTCUT_BEGIN block): detected by SHORTCUT_BEGIN marker present BUT no `--pull` substring. Sed-deletes the range, appends new format.
3. **Oldest legacy yesplease-only with vanity marker** (`# claude-dotfiles vanity command:`): detected by that literal marker. Sed-deletes from marker through next `^}$`, appends new format.

Detection heuristic uses `awk` to extract the marker-bounded block and `grep -Fq -- "--pull"` to test. The literal `--` before `--pull` in the grep is required so grep doesn't treat `--pull` as one of its own flags.

## Heredoc escaping

The new function definition is appended via unquoted `<<EOF`, so:
- `$REPO_DIR` expands at install time (bakes the absolute path into the function body)
- `\$@`, `\$arg`, `\${args[@]}`, `\$pull` are escaped so they survive into the function body as zsh syntax

Verified by inspecting the resulting block in `~/.zshrc` after a real install run.

## Component metadata

- KEY: `ampersand` (was `yesplease`)
- TITLE: "'ampersand' shell shortcut"
- DESC: explains both `ampersand` and `ampersand --pull`, mentions back-compat alias, mentions bootstrap pre-installs it
- `--help` valid keys list: `yesplease` -> `ampersand`
- post-install summary: `picked yesplease && echo "..."` -> `picked ampersand && echo "..."`

## README updates

All `yesplease` invocations in code blocks updated to `ampersand --pull` or `ampersand` as appropriate. Five remaining mentions of `yesplease` in prose are intentional context (explaining the back-compat alias and migration history). Quick-start tier rewritten to describe the new bootstrap flow ("That clones the repo and installs one thing: the ampersand shell shortcut...").

# Why

User flagged that the curl|bash flow should not auto-launch the TUI. Two reasons:

1. **The shortcut should be ambient**, not gated behind a component pick. Once installed, `ampersand` should just be there - the same way `git` is just there.
2. **Two commands for two related actions is redundant.** `yesplease` and `ampersand` differed only by whether to git pull first. Collapsing them into `ampersand` and `ampersand --pull` is the standard CLI flag pattern, not a separate command.

The back-compat alias preserves muscle memory for anyone who's been typing `yesplease` for weeks - they don't have to relearn.

# How to apply

Live on this machine after the migration ran (the install.sh --only ampersand --yes invocation triggered the legacy-block sed-delete + new-block append). Other machines pick up via `ampersand --pull` (which uses the existing yesplease/ampersand function on those machines, pulls the new install.sh, runs it, the new logic detects the legacy block and migrates).

# Files touched

- `install.sh` (component renamed; new function definition; migration logic for three legacy formats; help/summary/preset updates)
- `bootstrap.sh` (minimal-mode default; pass-through behavior preserved; "Unpacking installer..." UX)
- `README.md` (Quick start rewrite; component table updates; workflows section rewrite; customization references)
- `.claude/memory/session_2026-04-28_bootstrap-ampersand-pull.md` (this file)
- `.claude/memory/MEMORY.md` (index entry)
