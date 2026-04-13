# Global Memory

## References
- [cmux browser pane](reference_cmux_browser.md) - Use cmux built-in browser for UI verification when inside a cmux terminal; prioritize over Chrome MCP

## Sessions
- [Enforcement hooks v1 setup](session_2026-04-13_enforcement-hooks.md) - PreCompact + PreToolUse Bash + PreToolUse Write/Edit hooks installed in ~/.claude/hooks/

## Feedback
- [Hook verification discipline](feedback_hook_verification_discipline.md) - Pipe-test raw hook commands before wiring into settings.json; use python3 -c json.dumps for fixtures, not echo
- [Planner pipeline drift](feedback_planner_pipeline_drift.md) - Cap planner-reviewer-remediator iterations at 2; switch language if bash hits its safe envelope
