---
name: Voice toggle hook + dotfiles sync
description: UserPromptSubmit hook for voice on/off; synced all missing hooks (resume + voice) into dotfiles repo with installer wiring
type: project
---
## What
Built a voice on/off toggle system mirroring the resume-guard toggle pattern. Then synced all 5 missing hooks into the dotfiles repo.

## How it works
- Voice-output MCP server uses `~/.claude/.voice-enabled` flag file (present = ON, absent = muted)
- `~/.claude/hooks/voice-toggle.sh` - UserPromptSubmit hook catches chat commands
- `~/.claude/toggle-voice.sh` - standalone toggle script

## Chat commands
- `voice on` - enable voice (creates flag file)
- `voice off` - mute voice (removes flag file)
- `voice toggle` - flip current state
- `voice status` - report current state

## Shell fallback
`! ~/.claude/toggle-voice.sh [on|off]`

## Dotfiles sync
All 5 missing scripts (3 hooks + 2 toggle scripts) added to the repo and deployed as symlinks:
- `claude/hooks/resume-guard.sh` - SessionEnd hook (deletes nyx session files when blocked)
- `claude/hooks/resume-toggle.sh` - UserPromptSubmit hook for `resume on/off/toggle/status`
- `claude/hooks/voice-toggle.sh` - UserPromptSubmit hook for `voice on/off/toggle/status`
- `claude/toggle-resume.sh` - standalone resume toggle
- `claude/toggle-voice.sh` - standalone voice toggle

Deployed copies in `~/.claude/` replaced with symlinks to repo.

## Files touched
- `claude/hooks/voice-toggle.sh` (new)
- `claude/hooks/resume-guard.sh` (new, was only in ~/.claude)
- `claude/hooks/resume-toggle.sh` (new, was only in ~/.claude)
- `claude/toggle-voice.sh` (new)
- `claude/toggle-resume.sh` (new, was only in ~/.claude)
- `~/.claude/settings.json` - wired voice-toggle hook into UserPromptSubmit array

## Collaborator
Jonah
