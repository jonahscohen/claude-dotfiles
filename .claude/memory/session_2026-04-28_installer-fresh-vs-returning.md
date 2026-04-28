---
name: Installer fresh-vs-returning UX rework with state file, update check, action loop
description: Installer now branches on whether it's a fresh or returning user via a JSON state file at ~/.claude/.dotfiles-state. Fresh users see a 2-option picker (whole vs a-la-carte). Returning users see an update check first, then a per-component action menu (install/activate/deactivate) that loops until they quit. Existing flag-driven paths (--yes, --only, --preset, --dry-run, --personal) keep working unchanged.
type: project
---

Collaborator: Jonah Cohen

# What changed

## State file: ~/.claude/.dotfiles-state (JSON)

```json
{
  "version": 1,
  "first_install_at": "2026-04-28T17:00:00Z",
  "last_run_at": "2026-04-28T17:00:00Z",
  "last_install_sha": "abc1234",
  "components": {
    "claude": "active",
    "memory": "active",
    "skills": "active",
    "statusline": "inactive",
    "cmux": "not-installed",
    "nvm": "active",
    "ampersand": "active"
  }
}
```

Three states per component: `active`, `inactive`, `not-installed`. The state file's existence is the fresh-vs-returning signal.

`state_init_if_missing`, `state_get`, `state_set`, `state_record_sha` helpers use python3 stdlib JSON.

## Per-component disk-based detection

`detect_component <key>` checks the actual on-disk artifacts (symlink presence, marker grep in CLAUDE.md, marker grep in .zshrc, skill dir presence, etc.) and returns `active` or `not-installed`.

`effective_state <key>` combines disk + state file: disk wins (if disk says active, return active); otherwise check the state file for "inactive" annotation; otherwise "not-installed."

## Update check

`check_updates` runs `git fetch origin main` then `git log HEAD..origin/main --pretty=format:'%s' | head -10` to surface up to 10 commit subjects as update notes. `apply_update` runs `git pull --ff-only`.

## Deactivation functions (NEW)

One per component: `deactivate_claude`, `deactivate_memory`, `deactivate_skills`, `deactivate_statusline`, `deactivate_cmux`, `deactivate_nvm`, `deactivate_ampersand`. Plus a dispatcher `deactivate_component <key>`.

Each function removes the on-disk artifacts created by its install path. For symlinks: `rm -f`. For .zshrc marker blocks: `sed -i.bak` between markers. For memory: sed-deletes the CLAUDE.md block AND uses python to strip the three memory hooks from settings.json (only when settings.json is the user's real file, not our symlink, to avoid mutating the repo).

## Fresh-install flow (`fresh_flow`)

1. Show yes& banner
2. `gum choose` between "Install the whole thing" and "Install à la carte" (text fallback when gum absent)
3. Whole-thing path: `set_all 1`, show inline picks summary, gum confirm, fall through to apply phase
4. À la carte path: existing `run_tui_gum` (or text fallback) runs as before

## Returning-user flow (`returning_flow`)

1. Show yes& banner
2. Run `check_updates`. If commits behind origin/main:
   - List them in green prefixed with `+`
   - Prompt to pull. Yes -> `git pull --ff-only`, print "Restart 'ampersand' to pick up the new version", exit 0.
   - No -> continue to action loop.
3. Action loop (until user quits):
   - Print component status table (active in green, inactive in yellow, not-installed dimmed)
   - User picks a component (or `(quit)`)
   - Pick an action based on current state:
     - active -> `deactivate`
     - inactive -> `activate` or `remove from state`
     - not-installed -> `install`
   - Run action:
     - install/activate -> `set_all 0; set_pick "$pick" 1; did_install=1; break` (falls through to apply phase, which installs only that component, then the script exits via the apply-phase summary)
     - deactivate -> `deactivate_component "$pick"; state_set "$pick" inactive`, redraw menu
     - remove from state -> `state_set "$pick" not-installed`, redraw menu
4. If `did_install=0` (no install was queued), record SHA in state file and `exit 0` so the apply phase doesn't run with empty PICKS.

## Bootstrap for existing users (no state file yet)

Existing users (you, anyone who installed before this commit) have components already active on disk but no state file. To avoid sending them through the fresh-install flow incorrectly: the entry point checks if the state file is missing AND any component is already active. If so, it bootstraps the state file from on-disk reality before dispatching to `returning_flow`. Future runs see the state file and behave normally.

## State file write at end of every install run

Even when the user goes through the non-interactive flag-driven path (`--yes`, `--only`, `--preset`), the script now ends by detecting all component states and writing them to the state file. So one full install run from any path is enough to bootstrap state tracking.

## Existing flag-driven paths unchanged

`--yes`, `--only`, `--preset`, `--dry-run`, `--personal`, `--help` all behave exactly as before. Only the interactive path (no flags / `NONINTERACTIVE=0`) goes through the new fresh/returning dispatch.

# Why

User asked for a cleaner installer presentation that distinguishes a brand-new machine (where the welcome should be expansive) from a returning user (where the priority is "are there updates?" and "let me toggle things on/off"). The previous TUI showed a 7-component checkbox picker on every run, which buried both the orientation and the maintenance use case under the same UI.

# Verification done

- `bash -n install.sh` clean
- `--dry-run --yes` resolves correctly (existing path unchanged)
- `--help` still hides `--personal`
- State file does not yet exist on this machine, so the next interactive `ampersand` run will hit the bootstrap-from-disk path (since `claude`, `memory`, `skills`, etc. are all active on disk) and write the state file the first time.

# Files touched

- `install.sh` (state infra, detection, update check, deactivate functions, fresh_flow, returning_flow, entry-point dispatch with bootstrap, state-write at end)
- `.claude/memory/session_2026-04-28_installer-fresh-vs-returning.md` (this file)
- `.claude/memory/MEMORY.md` (index entry)

# Open known limitations to flag

- The `claude` component's deactivate function symlink-removes everything we created, but the user's pre-install backups in `.backups/<timestamp>/` aren't auto-restored. Manual restore is documented in the README troubleshooting.
- The action menu ONE install at a time per session: if the user wants to install three components at once, they currently have to either pick "Install à la carte" in fresh mode (not available in returning mode) or invoke `ampersand --only a,b,c`. Could add a multi-select install path in the returning menu later.
- "remove from state" only changes the state-file annotation. It doesn't touch disk. Useful when the state file gets out of sync with reality.
