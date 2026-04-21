# Global Memory

## References
- [cmux browser pane](reference_cmux_browser.md) - Use cmux built-in browser for UI verification when inside a cmux terminal; prioritize over Chrome MCP

## Sessions
- [PAUSE STATE - start here](session_2026-04-21_pause-state.md) - Full status of enforcement hooks (3/6 built), dotfiles portability (done), startup-check analysis (not implemented), what to do next
- [Enforcement hooks v1 setup](session_2026-04-13_enforcement-hooks.md) - PreCompact + PreToolUse Bash + PreToolUse Write/Edit hooks installed in ~/.claude/hooks/
- [Discord launcher folded into dotfiles](session_2026-04-14_discord-launcher-dotfiles.md) - Moved ~/.claude/discord-chat-launcher.sh into claude-dotfiles, install.sh wiring added
- [Ghostty placeholder + discord auto-wire](session_2026-04-14_portability-fixes.md) - Fixed ghostty path-pong (copy + placeholder), auto-wire discord source line into .zshrc with path-based idempotency

## Feedback
- [Hook verification discipline](feedback_hook_verification_discipline.md) - Pipe-test raw hook commands before wiring into settings.json; use python3 -c json.dumps for fixtures, not echo
- [Planner pipeline drift](feedback_planner_pipeline_drift.md) - Cap planner-reviewer-remediator iterations at 2; switch language if bash hits its safe envelope
