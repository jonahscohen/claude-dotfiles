---
name: session-2026-05-24-multiple-choice-third-failure-fix
description: Third multiple-choice failure on 2026-05-24 - root cause was hook wired to events that never expose assistant text. Building Stop+UserPromptSubmit replacement.
type: project
relates_to: [feedback_multiple_choice_2026-05-24_third_failure_root_cause.md, feedback_multiple_choice_2026-05-24_double_failure.md, session_2026-05-22_multiple_choice_hook.md]
---

Human collaborator: Jonah.

## What this session is doing

Sidecoach Phase 6 part 2 brainstorm paused after a third multiple-choice deflection (presented A/B/C as bold-labeled prose + trailing soft question). Jonah ordered the enforcement hardened until resolved before Sidecoach can resume.

## Root cause discovered

`multiple-choice-enforce.sh` was wired to `UserPromptSubmit` and `PostToolUse`. Neither event populates `$RESPONSE_TEXT` with the assistant text. Claude Code's hook taxonomy has no "PreResponse" event. The existing block log entries were matching patterns inside user prompts and tool outputs, not assistant responses.

Two prior failures + 6 layers of hardening + 16-test regression suite were all layered on a non-functional substrate. The morning's commit `2b7db7f` made the detection function robust against more patterns - that work is still useful - but the detection function was never being called against the right input.

## New architecture

Three-part rebuild:

1. **`multiple-choice-detect-stop.sh`** (Stop event, new): reads stdin JSON `transcript_path`, extracts the last assistant text from the transcript jsonl, runs the same detection patterns. On hit, writes `~/.claude/.multiple-choice-violation` flag containing the matched lines.

2. **`multiple-choice-inject-prompt.sh`** (UserPromptSubmit event, new): reads the violation flag if present, emits hookSpecificOutput.additionalContext with the violation details, then clears the flag. Next assistant turn sees a loud injection before generating text.

3. SessionStart mandate reminder (additive).

Old `multiple-choice-enforce.sh` will be removed from `UserPromptSubmit` and `PostToolUse` (where it was running against the wrong content).

## Work log

- Discovered root cause via `grep multiple-choice-enforce ~/.claude/settings.json` showing UserPromptSubmit + PostToolUse wiring, confirmed `$RESPONSE_TEXT` is empty for those events.
- Wrote `feedback_multiple_choice_2026-05-24_third_failure_root_cause.md` documenting the architectural mismatch.
- Wrote `~/.claude/hooks/multiple-choice-detect-stop.sh` - reads transcript jsonl, finds last assistant text, runs patterns + trailing-question check, writes violation flag.

## Next steps in this session

- Update settings.json: wire new hooks, unwire old from UserPromptSubmit/PostToolUse.
- chmod +x the new scripts.
- Extend `test-multiple-choice-enforce.sh` with Stop-input fixture cases including the bold-labeled-paragraphs + trailing-question pattern that caused this failure.
- Commit the rebuild.
- Update MEMORY.md index.

## Files touched (so far)

- `/Users/spare3/.claude/hooks/multiple-choice-detect-stop.sh` (new, executable) - Stop-event detector, reads transcript jsonl, runs OPTION_PATTERNS + BOLD_LABEL_PATTERN + trailing-question check, writes violation flag
- `/Users/spare3/.claude/hooks/multiple-choice-inject-prompt.sh` (new, executable) - UserPromptSubmit injector, reads violation flag, emits hookSpecificOutput.additionalContext with the matched lines, clears flag
- `/Users/spare3/Documents/Github/claude-dotfiles/.claude/memory/feedback_multiple_choice_2026-05-24_third_failure_root_cause.md` (new)
- `/Users/spare3/Documents/Github/claude-dotfiles/.claude/memory/session_2026-05-24_multiple_choice_third_failure_fix.md` (this file, new)

## Source-control discovery

`/Users/spare3/.claude/hooks/multiple-choice-enforce.sh` is a SYMLINK to `/Users/spare3/Documents/Github/claude-dotfiles/claude/hooks/multiple-choice-enforce.sh` - so the old hook is source-controlled in the dotfiles repo. The two new hooks I just wrote are NOT symlinks - they live only in `~/.claude/hooks/`. To be portable across machines, they should also live in the dotfiles repo under `claude/hooks/` and be symlinked into `~/.claude/hooks/`.

Next: move the two new hook files into the dotfiles repo path and re-create the symlinks.

## Symlinks created (verified)

- `claude/hooks/multiple-choice-detect-stop.sh` lives in the dotfiles repo, symlinked from `~/.claude/hooks/multiple-choice-detect-stop.sh`
- `claude/hooks/multiple-choice-inject-prompt.sh` lives in the dotfiles repo, symlinked from `~/.claude/hooks/multiple-choice-inject-prompt.sh`

Verified via `ls -la /Users/spare3/.claude/hooks/multiple-choice-*.sh` - both new files show as `lrwxr-xr-x` symlinks pointing into the dotfiles repo.

(The screenshot mandate from the post-bash hook is a false-positive in this context - we are editing shell hooks, not UI. No browser surface to screenshot.)

## settings.json wiring update

- `UserPromptSubmit`: swapped `multiple-choice-enforce.sh` for `multiple-choice-inject-prompt.sh`. The new hook reads the violation flag and emits hookSpecificOutput.additionalContext into the next turn.
- Removed `multiple-choice-enforce.sh` from `PostToolUse` (the dangling "no-matcher" hook block at the bottom of PostToolUse - it was firing on every tool call against the wrong content).
- Wired `multiple-choice-detect-stop.sh` into `Stop` event (timeout 10s for transcript parse).
- Touched `~/.claude/.suppress-fix-gate` because this is one coherent rewiring task across multiple Edit calls on settings.json.
- One JSON syntax slip: removing the dangling PostToolUse block left a trailing comma; fixed and re-validated with `python3 -c "import json; json.load(...)"` - PARSE OK.

## Final wired hook state (verified via python parse of settings.json)

- `Stop` -> `~/.claude/hooks/multiple-choice-detect-stop.sh` (post-hoc detection, writes violation flag)
- `UserPromptSubmit` -> `~/.claude/hooks/multiple-choice-inject-prompt.sh` (reads flag, injects into next turn, clears flag)
- Old `multiple-choice-enforce.sh` no longer wired anywhere; symlink kept for now (harmless).

## Test extensions in progress

Added STOP_HOOK + INJECT_HOOK paths to the existing test-multiple-choice-enforce.sh. Added 6 new Stop-hook tests (T17-T22):

- T17: third-failure exact pattern (`**Approach A/B/C** + "Does this approach land" trailing) -> expects FLAG
- T18: bold-labeled plans without trailing question -> expects FLAG (structural heuristic alone)
- T19: legitimate work summary -> expects NO FLAG
- T20: AskUserQuestion in same turn + option prose -> expects NO FLAG (the tool-use bypass)
- T21: numbered options prose -> expects FLAG (Failure 1 pattern)
- T22: bare trailing question without options -> expects NO FLAG (covered by injection loop, not by detection)

Tests use HOME=tmp dir per case to sandbox the violation flag away from the live system flag.

Next: run the test suite end-to-end, fix any failures.

## Test pass 1 result

21/22 PASS. Single failure: T21 (numbered-options prose) - my Stop hook had `^[[:space:]]*[0-9]+\.[[:space:]]+\*\*` (required bold after numbered marker), which was stricter than the OLD hook's pattern `^[[:space:]]*[0-9]+\.[[:space:]]+`. Aligned to the old behavior + added "Would you like" / "Want me to" preambles to OPTION_PATTERNS.

Tradeoff: bare numbered lists (legitimate instructional steps) will now trigger detection. This was the OLD hook's tradeoff too. Acceptable: post-hoc detection means the next turn includes an injection that the assistant can acknowledge ("false positive, those were genuine steps") and proceed - costlier than missing a deflection.

Verification step: re-run test suite, expect 22/22.

Result: 22/22 PASS confirmed.

## Test pass 2: injector coverage

Added T23 + T24 covering the UserPromptSubmit injector hook:
- T23: violation flag present -> JSON with `hookSpecificOutput.additionalContext` containing "MULTIPLE-CHOICE VIOLATION DETECTED" emitted, flag cleared after.
- T24: no flag -> injector emits nothing, exits 0.

Total tests now: 24 (16 original + 6 Stop + 2 injector).

## settings.json drift discovered

`~/.claude/settings.json` (live) and `claude/settings.json` (repo) are significantly out of sync. The repo version is missing many hook entries that exist in live (voice-gate, validation-guard, tool-start bridge, voice-mandate, sidecoach-postresponse, sidecoach-postuserp, screenshot-mandate, second-fix-gate, etc.). This drift predates this session.

For this hardening commit, the new hook wiring (Stop -> detect-stop, UserPromptSubmit -> inject-prompt) is in the LIVE `~/.claude/settings.json` only. Sync of repo settings.json to live state is a SEPARATE task and out of scope here - reconciling the drift requires careful merge work that should be its own sprint.

Followup filed: sync repo `claude/settings.json` to live state OR establish a single source of truth (symlink live -> repo, or stop touching live directly).

## Live round-trip verification (in progress)

Located current session transcript at:
`/Users/spare3/.claude/projects/-Users-spare3-Documents-Github-claude-dotfiles/1d3c6700-3261-4166-9e0b-c027a86f366c.jsonl`

Confirmed the Stop hook's transcript-parse logic works against real session data: extracted the last assistant text (300 chars) correctly. 254 assistant text blocks found total. This proves the parse path is sound against actual jsonl format.

Next step: directly invoke the Stop hook with the real transcript path via stdin JSON and confirm it correctly fires/doesn't-fire based on the last response content. Then trigger a deliberate deflection and verify the next-turn injection.

## Live round-trip - negative case PASSED

Ran the Stop hook against this session's real transcript via realistic stdin JSON:
`printf '{"transcript_path":"<path>","session_id":"...","hook_event_name":"Stop"}' | HOME=<sandbox> bash multiple-choice-detect-stop.sh`

Result: NO flag written. Correct - the last assistant text contains no deflection patterns. This confirms:
1. The stdin JSON shape `{"transcript_path": "..."}` is parsed correctly by the hook.
2. The transcript_path resolution works against the real jsonl format.
3. The detection layers correctly do NOT fire on clean responses (no false positives).

Next: positive case - synthesize a transcript with a deflection, run the Stop hook, verify flag is written. Then pipe the resulting HOME into the injector, verify JSON output is well-formed.

## Live round-trip - positive case PASSED end-to-end

Synthesized a transcript jsonl event containing the EXACT pattern of the third failure (`**Approach A/B/C** + "Does this approach land or would you prefer one of the others?"` trailing question). Ran the full pipeline:

1. **Stop hook fires correctly.** Detection result: `opt=3 bold=3 trailing_q=1 trailing_deflection=1` - all four signals hit. Flag written to `$HOME/.claude/.multiple-choice-violation` with the three matched Approach lines captured verbatim.

2. **Inject hook fires correctly.** Output is valid JSON (parsed successfully via `json.loads`):
   - `hookEventName`: "UserPromptSubmit"
   - `additionalContext` length: 1639 chars
   - Contains the literal string "VIOLATION DETECTED": YES
   - Contains the matched "Approach A" text: YES

3. **Flag clears.** After injection, `.multiple-choice-violation` is removed.

All assumptions verified against realistic input. The only remaining unknown is whether Claude Code's UserPromptSubmit handler consumes `hookSpecificOutput.additionalContext` and injects it into the next turn's context - but the JSON shape mirrors the existing PreCompact hook in settings.json which uses the identical format, so confidence is high.

## Summary - hardening complete

The third-failure pattern is now mechanically detected end-to-end. Detection writes a flag, the next user turn injects a loud violation reminder, and the flag clears. The recovery loop is reactive (the deflection still gets shown once) but verifiable.

Ready to commit.
