---
name: Safe installer redesign - additive components, clean uninstall
description: Splitting monolithic claude into brain + config, making all installs additive (marker-guarded appends, JSON-merge), fixing all deactivation, adding picker descriptions, rebranding colors
type: project
---

Collaborator: Jonah Cohen

## Design decisions

- `claude` component splits into `brain` (CLAUDE.md content) and `config` (settings.json + hooks)
- Brain: marker-guarded append to ~/.claude/CLAUDE.md (user's existing content preserved)
- Config: JSON-merge into settings.json (user's defaultMode, model, etc. untouched), hook scripts copied alongside existing hooks
- Every component is now additive. Zero data loss risk.
- Every deactivation removes only what we installed, verified by marker or symlink target
- Discord scripts moved from old claude to discord component
- Voice and discord get proper deactivation functions
- `--only claude` stays as backward compat alias for `brain,config` with deprecation notice
- Returning-user picker shows component descriptions inline
- Color rebrand: red yes& logo, dark cyan accents (replacing purple)

## Spec

`docs/superpowers/specs/2026-05-01-safe-installer-design.md`

## Plan

`docs/superpowers/plans/2026-05-01-safe-installer.md` (7 tasks, 0-6)

## Progress

- Task 0: Color rebrand - in progress

## Files

- `install.sh` - all changes
- `docs/superpowers/specs/2026-05-01-safe-installer-design.md` - spec
- `docs/superpowers/plans/2026-05-01-safe-installer.md` - plan
