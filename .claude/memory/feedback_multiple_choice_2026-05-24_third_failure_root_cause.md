---
name: feedback-multiple-choice-2026-05-24-third-failure-root-cause
description: Third multiple-choice failure on 2026-05-24 - revealed the morning's hook hardening was layered on a non-functional substrate. Claude Code has no PreResponse hook event; the old hook could never see assistant text. Documents the architectural rebuild required.
type: feedback
relates_to: [feedback_multiple_choice_2026-05-24_double_failure.md, feedback_options_use_multiple_choice.md]
---

Human collaborator: Jonah.

## What happened

Third failure on 2026-05-24, during Sidecoach Phase 6 part 2 brainstorming. Presented three approaches as bold-labeled paragraphs in prose, followed by a soft trailing question ("Does this approach land, or would you prefer one of the others?"). Did not invoke AskUserQuestion.

Jonah caught it, paused Sidecoach, and ordered the enforcement hardened until the problem is resolved.

## Why this is bigger than the previous two

The morning's hardening (commit 2b7db7f) added 6 detection layers + a 16-test regression suite to `multiple-choice-enforce.sh`. All of that work was layered on top of a broken substrate: the hook is wired to `UserPromptSubmit` and `PostToolUse`, neither of which exposes the assistant's response text.

- `UserPromptSubmit` populates with the user's input prompt
- `PostToolUse` populates with tool args + tool output
- Neither populates `$RESPONSE_TEXT` with assistant text - `$RESPONSE_TEXT` is never set for these events

The existing block log entries (BLOCK opt=N bold=N) were matching patterns inside user prompts or tool outputs, not assistant text. The hook has been silently non-functional for the actual case it claims to police.

Test suite (`test-multiple-choice-enforce.sh`) only feeds the detection function directly - it never exercises the actual hook event wiring. So 16/16 tests can pass while the hook never fires in production.

## Root cause

Claude Code's hook event taxonomy does NOT include a "PreResponse" or "OnAssistantMessage" event. Available events:

- `UserPromptSubmit` - on user input
- `PreToolUse` / `PostToolUse` - on tool calls
- `Stop` / `SubagentStop` - after assistant message completes
- `SessionStart` / `SessionEnd` / `PostCompact` / `PreCompact` / `Notification`

The only event with access to assistant transcript content is `Stop` - and it fires AFTER the user has already seen the message. Stop cannot block; it can only detect post-hoc.

The hook author (Claude, this morning) assumed `RESPONSE_TEXT` would be populated on some event - it never is.

## New architecture

Three-part rebuild:

1. **`multiple-choice-detect-stop.sh`** (Stop event): reads `transcript_path` from stdin JSON, extracts the last assistant message text from the transcript jsonl, runs the existing deflection patterns. On detection, writes `~/.claude/.multiple-choice-violation` containing the violation reason + the matched line.

2. **`multiple-choice-inject-prompt.sh`** (UserPromptSubmit event): reads the violation flag if present, emits a hookSpecificOutput.additionalContext block screaming the violation back at the next turn with the exact rule and the matched text, then deletes the flag. The next response cannot proceed without acknowledging the violation.

3. **`multiple-choice-mandate-session.sh`** (SessionStart event): on session start (after PostCompact also), emits a persistent mandate reminder: "MULTIPLE CHOICE: Every question with 2+ options MUST go through AskUserQuestion tool. No exceptions. Plain-text option lists trigger post-hoc detection + loud next-turn injection."

Old `multiple-choice-enforce.sh` is REMOVED from `UserPromptSubmit` and `PostToolUse` wiring - those events never saw the right content. Detection logic moves into `multiple-choice-detect-stop.sh`, sharing the same pattern definitions.

## Why this works

- Stop fires reliably with full transcript access
- The post-hoc detection leaves NO way to deny the violation - the matched text is captured verbatim
- Injection at UserPromptSubmit puts the screaming reminder INTO the context window, so the response generation sees it before producing text
- SessionStart mandate keeps the rule pinned for cold sessions

This is reactive (the deflection happens once before enforcement bites), but the test cycle is: deflection -> next-turn injection -> Claude apologizes + uses AskUserQuestion. The user pays one bad response, then enforcement holds.

The previous "PreResponse-blocking" model was an impossibility under Claude Code's hook taxonomy. This is the right shape for the platform.

## What changed in the test suite

`test-multiple-choice-enforce.sh` now also exercises the Stop hook path: simulated stdin JSON with a fixture transcript file, verifies the violation flag is written. Adds a regression case for THIS failure (the bold-labeled-paragraphs-plus-trailing-question pattern that slipped through).

## Followups documented elsewhere

- `session_2026-05-24_multiple_choice_third_failure_fix.md` will record the rebuild commit(s)
- The 16-test suite is extended to 20+ tests covering the new Stop+inject pipeline
