---
name: Hook verification discipline - pipe-test before wire
description: When building Claude Code hook scripts, always pipe-test the raw command with synthesized stdin before editing settings.json - skipping this step shipped silently broken hooks
type: feedback
---

When constructing Claude Code hooks (PreToolUse, PostToolUse, Stop, PreCompact, etc.), pipe-test the raw command with a synthesized stdin payload BEFORE wiring it into settings.json. Confirm: (1) exit code, (2) JSON validity of stdout, (3) every branch of the decision logic.

**Why:** Pipe-testing the content-guard hook surfaced a bug that all 10 test cases would have silently passed in production: `python3 <<'PYEOF' ... PYEOF` consumes Python's stdin with the heredoc body, so the piped JSON never reaches Python. Every input returned `{}` (empty allow). Without pipe-testing, the hook would have been silently inert - blocking nothing - while appearing wired correctly in settings.json. The skill `update-config` documents this verification workflow; following it caught the bug before deployment.

**How to apply:** For any new hook script, run `echo '<fake-input-json>' | <command>` and inspect output BEFORE adding to settings.json. For PreToolUse/PostToolUse, fake input is `{"tool_name":"<tool>","tool_input":{...realistic payload...}}`. For Stop, `{}` suffices. Test both allow and deny branches. Use `python3 -c 'json.dumps(...)'` to construct test fixtures - NOT `echo` - because zsh's echo expands `\n` and `\u` escapes inconsistently with bash, producing invalid JSON and false test failures.

**Bash pattern for hooks that need stdin in Python:** Use `INPUT=$(cat); printf '%s' "$INPUT" | python3 -c '...'` NOT `python3 <<'PYEOF' ... PYEOF`. The heredoc form replaces stdin with the Python source code itself.
