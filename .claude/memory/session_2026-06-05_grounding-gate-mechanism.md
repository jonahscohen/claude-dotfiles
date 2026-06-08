---
name: Grounding gate - mechanical hook that forces read-code+beats before probing the running app
description: Built the failproof mechanism Jonah demanded after the black-box-diagnosis failure. A two-hook combo (designed by the grounding-enforcer teammate, implemented by lead): grounding-gate.sh (UserPromptSubmit) detects a build-behavior diagnostic question and ARMS a flag + injects a read-first mandate; grounding-guard.sh (PreToolUse) DENIES browser/screenshot probes while armed until a Read/Grep/grep-Bash happens that turn (then auto-disarms). Lexicon in grounding-intent.json. 11/11 tests pass, wired + symlinked live.
type: decision
relates_to: [session_2026-06-05_self-analysis-blackbox-not-reading.md, decision_hook_layer_as_enforcement.md, feedback_hooks_evolve_over_time.md]
---

Collaborator: Jonah. 2026-06-05.

Choice made: move the failed CLAUDE.md "read code+beats before diagnosing" rule into a mechanical two-hook gate (inject + deny), mirroring the proven sidecoach-keyword (inject) + validation-guard (deny) patterns.

**Alternatives considered:**
- Stronger CLAUDE.md wording: rejected - the rule already existed (Debugging/Beats Discipline) and had no teeth; a passive instruction with no trigger is what failed.
- PostToolUse nag after a screenshot: rejected - fires after the wasted probe, not before; no teeth.
- Block ALL screenshots when any beats are unread: rejected - bricks the verification protocol, banner-blindness.

**Why this one:** UserPromptSubmit detection (like sidecoach) arms only on diagnostic build-behavior questions; PreToolUse deny (like validation-guard) physically blocks the probe until grounding happened THIS turn; one grep disarms it. Friction is a single grounding action, exactly the action that surfaces the answer.

**Revisit when:** false-positive rate on the lexicon is annoying (tune grounding-intent.json), or MCP/tooling changes the probe tool names.

## Implementation (all in claude/hooks/, symlinked to ~/.claude/hooks/)
- grounding-intent.json - tunable lexicon: diagnostic_frames, broken_state, behavior_verbs, build_nouns, config{cooldown_seconds:900, arm/cooldown state files}, nudge. Fire = (diagnostic_frame OR broken_state) AND (behavior_verb OR build_noun), informational-suppressed.
- grounding-gate.sh (UserPromptSubmit) - forks sidecoach-keyword skeleton (sanitize + informational suppression). On hit: writes ~/.claude/.grounding-armed (epoch) + injects the read-first mandate. Respects ~/.claude/.grounding-cooldown. Env overrides GROUNDING_ARM_FILE / GROUNDING_COOLDOWN_FILE / GROUNDING_COOLDOWN for tests.
- grounding-guard.sh (PreToolUse) - the teeth. is_probe() gates chrome (computer/navigate/screenshot/read_page/get_page_text/left_click/scroll/find/read_console_messages) + computer-use + Bash `cmux browser ... screenshot/snapshot/navigate`. If armed and the transcript shows NO Read/Grep/Glob/grep-family-Bash tool_use with timestamp >= arm_ts -> DENY (permissionDecision deny, like validation-guard.sh). First grounding tool_use since arm -> remove arm file + write cooldown -> ALLOW. FAILS OPEN on any parse error / missing transcript / subagent (is_subagent via isSidechain|teamName) so it never bricks the browser.
- test-grounding-guard.sh - 11 cases (gate arm/suppress, guard deny/allow/disarm/stale-ignore/unarmed/non-probe/subagent). 11/11 pass. (Caught + fixed a test-only `((PASS++))`-returns-1-when-zero bug.)
- settings.json: grounding-gate.sh added to UserPromptSubmit (after sidecoach-keyword); grounding-guard.sh added to PreToolUse on Bash AND a new matcher `mcp__claude-in-chrome__|mcp__computer-use__`.

## Would it have caught THE failure?
Yes (walk-through, verified by the deny test): "why aren't my changes showing in the bottom-left panel" -> gate arms + injects. I reach for a chrome screenshot -> guard sees armed + zero grounding -> DENY "grep the panel source + read the beats first." I run `grep changes-panel justify/core` -> hits the bottom:68px;left:20px line -> flag disarms -> answer self-evident in 2 steps, no screenshot-guessing.

## Honest leak (documented, not hidden)
The guard verifies grounding HAPPENED, not that it was relevant or understood. An unrelated grep disarms it. Backstop is incentive (the cheapest disarming grep is the one naming the answer, since MEMORY.md lists the files) + the CLAUDE.md rule for the irreducible comprehension gap. Failproof for "probed before opening the code"; not for "opened the code but skimmed."

## Files
- claude/hooks/grounding-intent.json, grounding-gate.sh, grounding-guard.sh, test-grounding-guard.sh (new, symlinked live)
- claude/settings.json (UserPromptSubmit + 2 PreToolUse wirings)
