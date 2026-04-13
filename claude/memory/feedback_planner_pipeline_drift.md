---
name: Planner pipeline scope drift
description: Multi-pass planner-reviewer-remediator agent pipelines accumulate complexity faster than they resolve bugs - cap iterations at 2 and switch language if bash hits its safe envelope
type: feedback
---

When chaining planner -> reviewer -> remediator -> QA agents on a bash/shell task, each pass finds real bugs but each remediation introduces new ones. Past v3.5 (~300 lines of bash), the language hits its safe envelope and the pipeline never converges.

**Why:** Observed across four iterations on the startup-check.sh remediation (v3 -> v3.5 -> v3.6 -> v3.7). Each reviewer caught real defects (`$'\x1f'` ANSI-C quoting in double-quoted strings broken on bash 3.2; `find -mtime` reading symlink mtime not target mtime; `stat -f` having different semantics on macOS vs Linux; `$()` command substitution stripping trailing newlines, etc.). But each remediation pass introduced equivalent new defects (python3 string interpolation injection, ALERT_TRUNCATED flag set but never surfaced, inode-vs-resolved-path dedup confusion). Final v3.7 was rejected with five new blockers. The complexity is self-generating because each reviewer asks "what bugs does this have" and each planner asks "how do I resolve these gaps" - neither is asked "should this exist."

**How to apply:** When iteration N produces blockers in features added by iteration N-1, stop. Either (a) ship a minimal subset of the original problem statement and skip the new features, or (b) switch the implementation language (bash -> python in this case removes the entire stat/sort/quoting/portability blast radius). Don't run a third remediation pass on a bash hook script. The user's pushback ("we veer off the beaten path") was the right signal earlier than I caught it.
