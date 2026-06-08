---
name: /consolidate skill + beat-cluster detector
description: Built /consolidate (merge a redundant beat cluster into ONE canonical beat, supersede-not-delete) + SessionStart consolidate-nudge detector. Human-gated, no cron.
type: project
relates_to: [session_2026-06-05_memory-index-auto-compaction.md, feedback_shortcuts_are_lies.md]
---

Collaborator: Jonah. 2026-06-05. Built as `builder` on team consolidate-build (team-lead + verifier).

## What was built
A human-gated way to collapse topic-redundant beats. Two pieces:

1. **claude/skills/consolidate/SKILL.md** - `/consolidate [topic]`. Procedure: pick topic (arg or auto-pick biggest cluster) -> gather session_/reflection_ beats matching the topic, HARD-excluding standing feedback_/decision_/reference_ -> SURFACE the membership list and get human confirmation (gate) -> read every confirmed beat in full -> write ONE canonical `session_DATE_<topic>-consolidated.md` (lede-first, sectioned by sub-topic, every durable fact+decision, `supersedes: [originals]`, carried-forward relates_to) -> set `superseded_by: <canonical>` on each original (frontmatter only, file untouched) -> swap the cluster's MEMORY.md pointers for one canonical pointer -> count-conservation verify. Compactor ages out the superseded pointers; skill never edits the compactor.

2. **claude/hooks/consolidate-nudge.sh** (SessionStart) + **claude/hooks/consolidate-intent.json** (tunable config). Detector counts per-topic filename-token clusters and emits advisory additionalContext when the biggest is >= threshold (default 12). Sibling to reflect-nudge.sh; wired into settings.json SessionStart alongside reflect-nudge + memory-compact. Both files symlinked into ~/.claude/hooks.

## Key decisions
- **Sibling hook, not an edit to reflect-nudge.sh.** Why: the live ~/.claude/hooks/reflect-nudge.sh is a COPY (not a symlink), so editing it deepens copy-vs-repo divergence; reflection cadence and cluster size are different signals; new-hook+JSON-config matches the modern convention (grounding-*). How: consolidate-nudge.sh mirrors grounding-gate.sh's bash+python-heredoc shape and reflect-nudge.sh's SessionStart output contract.
- **Supersede-not-delete is the safety linchpin.** Originals stay on disk, grep-able; only one frontmatter line added. Skill repeats "never delete" and ends with a count-conservation check (confirmed originals == supersedes entries == originals carrying superseded_by) + a no-deletion file-count check.
- **Standing beats excluded everywhere** by the same prefix tuple compact-memory.py uses (feedback_/decision_/reference). Trap closed: `tilt` token matches feedback_tilt_lab_fidelity_mandate.md, which must never be swept in. Detector counts tilt=48 (session only), not 49.
- **Team-lead's 5 refinements all baked in:** (1) exclude standing; (2) surface-then-confirm gate, bias to under-match; (3) idempotence - skip already-superseded, merge only new into an existing canonical, never re-consolidate canonical into itself; (4) canonical = comprehensive-but-skimmable, sectioned, description <=200 chars; (5) carry forward relates_to.

## Verified
- bash -n + py_compile (extracted heredoc) + json.load all clean. settings.json valid; consolidate-nudge present in SessionStart.
- Detector on REAL corpus (398 beats): fires `tilt` 48 (NOT 49 - standing feedback excluded), then lab 45, improv 28. Threshold 100 -> silent {}. Active cooldown -> silent. No memory dir -> silent.
- Adversarial standing-exclusion proof: temp dir 3 session_tilt + 1 feedback_tilt; threshold 3 fires, threshold 4 stays SILENT (would fire only if feedback counted) - proves exclusion.
- End-to-end through the symlink with SESSION_CWD set (the real settings.json invocation) fires correctly.
- Env overrides for the verifier's harness: CONSOLIDATE_MEMORY_DIR, CONSOLIDATE_THRESHOLD, CONSOLIDATE_COOLDOWN, CONSOLIDATE_COOLDOWN_FILE.

## CRITICAL FIX (verifier catch, same session) - exclude by frontmatter TYPE, not filename
First cut excluded standing beats by FILENAME prefix (feedback_/decision_/reference), mirroring compact-memory.py's STANDING tuple. verifier's corpus inspection found the hole: of 49 tilt-token files, 42 are type:project but 7 are standing (4 decision + 3 feedback) - and 6 of those 7 carry a `session_*` FILENAME with a standing TYPE (e.g. session_2026-05-29_tilt-lab-design-direction.md is type: decision). Filename-prefix exclusion would have swept those 6 into the merge = destruction of long-lived reasoning = data loss. Fix: select consolidatable set by frontmatter `type` (default just `project`), filename-agnostic.
- Why: CLAUDE.md says decision beats are long-lived; a session_ filename does not make a beat consolidatable - its TYPE does.
- How: detector reads each beat's frontmatter `type:` (head 1500 bytes) and counts only consolidatable_types (config, default ["project"]); skill Step 2 selects type:project AND topic AND not-already-superseded, with the 7 real tilt standing beats listed by name as the trap; Step 9 verify + "NOT for" updated to type-based.
- Re-verified: detector on real corpus now reports tilt=42 (was 48), lab 39, improv 27. New adversarial temp test: 3 project + 2 standing-TYPE session_ files; fires at threshold 3 (project only), SILENT at threshold 4 - proves session_-filename-but-standing-type files are never counted. Real consolidatable tilt cluster = 42; the 7 standing beats must stay untouched.
- Config change: exclude_prefixes -> consolidatable_types: ["project"].

## Scope / not done
- Human-GATED only. No autonomous cron (deliberate, post-trust step).
- Detector is advisory (additionalContext only, always exit 0, never blocks).

## Files
- claude/skills/consolidate/SKILL.md (new)
- claude/hooks/consolidate-nudge.sh (new, symlinked, +x)
- claude/hooks/consolidate-intent.json (new, symlinked)
- claude/settings.json (SessionStart: added consolidate-nudge.sh)
