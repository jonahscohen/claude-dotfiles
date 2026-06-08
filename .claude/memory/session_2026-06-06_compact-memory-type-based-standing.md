---
name: compact-memory.py standing-detection hardened to frontmatter type
description: compact-memory.py now identifies standing beats by frontmatter type (decision/feedback/reference/user), not filename prefix, so session_-named standing beats stay in the live index. + regression test.
type: project
relates_to: [session_2026-06-05_memory-index-auto-compaction.md, session_2026-06-05_consolidate-skill-and-cluster-detector.md]
---

Collaborator: Jonah. 2026-06-06. Task #3 on team consolidate-build.

## What + why
Same bug class verifier caught in /consolidate, latent in the compactor. compact-memory.py's is_standing() keyed on FILENAME prefix (feedback_/decision_/reference), so a long-lived beat saved with a `session_*` filename but a standing TYPE (e.g. session_2026-05-29_tilt-lab-design-direction.md is type: decision) was NOT protected - the date-based archival could move its pointer out of the live index. Lower impact than the consolidate bug (archiving a pointer is reversible: the beat file stays, the pointer lands in MEMORY-archive.md, grep-able - NOT deletion), but the same correctness flaw, and a long-lived decision should stay in the LIVE index regardless of age.

## How (fix)
- Authoritative signal is now frontmatter `type`. New STANDING_TYPES = {feedback, decision, reference, user}; new frontmatter_type(filepath) reads the head (1500 bytes) of the referenced beat. is_standing(fn, memdir) returns `type in STANDING_TYPES`; falls back to the old filename-prefix tuple (STANDING_PREFIXES) ONLY when the file/type is unreadable (missing file, garbled frontmatter). main() passes memdir (the MEMORY.md dir) into is_standing.
- Cheap: reads only the small frontmatter of each referenced beat, and only when over BUDGET (archival path). Tolerates missing files.
- archive-by-date for genuine type:project session beats is UNCHANGED.

## Verified
- py_compile clean. New regression test claude/hooks/test-compact-memory.sh (loads the real module via importlib, shrinks BUDGET to force archival): 10/10 PASS - session_-named type:decision RETAINED in live index though oldest; type:project beats still archived; missing-file decision_ pointer retained via prefix fallback; missing-file non-standing session_ pointer archived via fallback; idempotent second run.
- Real corpus spot-check: is_standing now True for session_2026-05-29_tilt-lab-design-direction.md (decision) and _asset-gap-FAILURE.md (feedback), still False for session_2026-06-05_memory-index-auto-compaction.md (project). Old prefix-only logic returned False for the first two -> they could age out; now protected.

## Files
- claude/hooks/compact-memory.py (is_standing type-based + frontmatter_type helper + memdir plumbing)
- claude/hooks/test-compact-memory.sh (new regression test, +x)
