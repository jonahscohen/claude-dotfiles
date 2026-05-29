---
name: memory-nudge dirty-flag false-positive - root-cause de-quote fix
description: T-0033 - strip quoted spans before write-token matching so quoted arrows/write-words in commit messages no longer false-fire the dirty flag; supersedes the partial T-0028 pure-git patch
type: project
relates_to: [session_2026-05-28_memory_nudge_commit_arrow_fix.md]
---

Collaborator: Jonah. 2026-05-28. "Fix the recurring papercut once and for all."

## The real defect (broader than T-0028 thought)
memory-nudge.sh's Bash branch set the dirty flag via `is_write = any(tok in cmd for tok in writes)` over the RAW command. So ANY write token sitting inside a QUOTED span false-fired:
- `"> "` matching the arrow in `git commit -m "159 -> 185"` (the symptom T-0028 chased), AND
- `"rm "`, `"touch "`, `"mv "` appearing as ordinary words inside a commit message, AND
- the whole thing defeating T-0028's pure-git exemption the moment the command mixed git with a read helper, e.g. `git add x && echo y | grep z && git commit -m "p -> q"` (not pure-git -> fell through -> arrow matched). This mixed-compound form bit the Tier-1 integration commits twice.

T-0028 only patched the pure-git case. The root cause is substring-matching write tokens against text that includes quoted message/echo/grep content.

## Fix (root cause)
Strip quoted spans BEFORE any token match, then run is_memory / is_pure_git / is_write against the bare command. Real redirects and write commands are UNQUOTED; the false-positive text is always QUOTED.
```
_SQ = chr(39); _DQ = chr(34)
cmd_bare = re.sub(_SQ + "[^" + _SQ + "]*" + _SQ, " ", cmd)       # strip '...'
cmd_bare = re.sub(_DQ + "[^" + _DQ + "]*" + _DQ, " ", cmd_bare)  # strip "..."
```
is_memory, is_pure_git (kept as a secondary guard), and is_write all now read `cmd_bare`. This neutralizes the entire class (arrows AND write-words AND mixed compounds) while preserving detection of real unquoted writes.

## Self-analysis (a mistake I made mid-fix)
First attempt wrote the de-quote regexes with LITERAL single quotes (`re.sub(r"'[^']*'", ...)`). The hook's python body runs inside a shell single-quoted `python3 -c '...'`, so those literal single-quotes terminated the shell string and BROKE the live symlinked hook (syntax error at the bash layer). Caught immediately by the PostToolUse error the broken hook emitted; fixed by building the quote chars via chr(39)/chr(34) so no literal single-quote appears in the body.
Failure mode named: I edited the python body without accounting for its shell-single-quote wrapping. Lesson (reusable for ALL bash+python3 hooks in this repo): never put a literal single-quote inside the `python3 -c '...'` body - use chr(39), or double-quoted python strings only. The original body followed this rule (all double quotes); my addition violated it.

## Verification
test-memory-nudge.sh expanded to 15 cases (was 11), all PASS exit 0:
- NEW: mixed git+echo+grep compound w/ arrow -> clean (THE recurring bug); write-words (rm/touch/mv) inside a non-pure-git commit msg -> clean; real redirect `node build.js > out.txt` -> DIRTY; real `rm src/old.ts` -> DIRTY.
- Retained: arrow-in-pure-git-msg clean, plain commit clean, add-only clean, pure-git compound clean, `cat >> MEMORY.md` clears, real `sed -i` dirties, mixed sed-i+git dirties, read-only echo clean, + 3 Write/Edit path cases.
`bash -n` clean; live invoke returns `{}` (python body parses). The live hook is the repo symlink, so the fix is active immediately.

## Files
- claude/hooks/memory-nudge.sh (de-quote step + cmd_bare matching; chr()-built quote regexes)
- claude/hooks/test-memory-nudge.sh (11 -> 15 cases)
