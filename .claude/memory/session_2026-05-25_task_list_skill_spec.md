---
name: /task-list skill spec drafted
description: Brainstorm + spec for a global, root-level, git-synced task list skill driving TASKS.md at the dotfiles repo root
type: project
relates_to: [tasks_2026-05-21.md]
---

Collaborator: Jonah

Brainstormed `/task-list` skill with Jonah on 2026-05-25. Spec lives at `docs/superpowers/specs/2026-05-25-task-list-design.md`.

## Decisions locked in

- **Storage:** single `TASKS.md` at dotfiles repo root, committed to git.
- **Organization:** `## <area>` top-level, `### Active / Blocked / Done` sub-headers. Empty sub-headers omitted.
- **Verbs:** add, list, done, edit, remove, block, unblock, show. Full set, not minimal.
- **Sync:** git, single-user across machines. No multi-human assignment.
- **Schema per line:** checkbox, `T-NNNN`, `[P#]`, created date, description; optional trailing `[sprint-NN]`, `[BLOCKED: reason]`, `(done YYYY-MM-DD)`.
- **Defaults:** area inferred from cwd subdir; priority P2 when omitted; ID monotonic `T-NNNN` tracked via `<!-- Last ID: T-NNNN -->` comment.
- **Skill location:** global at `~/.claude/skills/task-list/SKILL.md`, installed by dotfiles `install.sh`.
- **Forward vs backward:** TASKS.md is forward-looking; sprint memory stays the backward-looking record. Tasks reference sprints via `[sprint-NN]`; sprint closed-memory references task IDs in prose.

## Rejected / deferred

- Free-form `#tags` (priority + area + sprint enough for now).
- Multi-human assignment.
- Due dates / estimates.
- Standalone `tasks` shell CLI binary.

## Spec self-review fixes

- Skill-location section originally said "walks up from cwd to find the nearest TASKS.md" - that would have picked up unrelated TASKS.md files in other repos. Tightened to **always operates on `~/Documents/Github/claude-dotfiles/TASKS.md`**; cwd is used only for area inference. Matches Jonah's intent ("for the dotfiles").

## Spec approved + committed

Jonah approved 2026-05-25. Committed as `9871ea1` (spec + memory only; other dirty files in working tree left untouched).

## Plan written

Plan at `docs/superpowers/plans/2026-05-25-task-list-skill.md`. Four tasks:

1. Seed `TASKS.md` skeleton at repo root.
2. Write `claude/skills/task-list/SKILL.md` (the full verb spec embedded in the plan).
3. Wire `install.sh` (10 touch-points modeled on the `reflect` component, all referenced by line number).
4. Smoke-test each of the 8 verbs in a fresh Claude session, with expected file diffs documented per step.

Recon used to write the plan: `reflect` component pattern in `install.sh` (lines 18, 55, 68, 83, 109-110, 126, 213, 234, 556, 889-892, 908, 2186-2208, 2298).

Next step: choose execution mode (subagent-driven vs inline) per writing-plans handoff.

## Task 1 complete

TASKS.md skeleton seeded at repo root (Last ID: T-0000).

## Task 2 complete

SKILL.md written at claude/skills/task-list/SKILL.md (123 lines). Verification passed: correct head/tail, line count >100, zero emdashes, no self-attribution. Ready for commit.

## Task 2 review fixes

- Fix 1 (Important): `add` step 1 - added parsing rule for `[area]` token matching before cwd inference bullets.
- Fix 2 (Important): `add` step 6 - clarified `<!-- Last ID: T-NNNN -->` comment always lives at top of file.
- Fix 3 (Important): `done` step 5 - replaced vague parenthetical with explicit sub-section ordering rule.
- Fix 4 (Nit): `done` step 1 - replaced surrouding-spaces anchor with "third whitespace-delimited token" phrasing.
- Fix 5 (Nit): `edit` step 3 - appended fallback "runs to end-of-line" when no trailing tags present.

All 5 fixes applied and verified. Committed as part of "fix(task-list): tighten SKILL.md per review".

## Task 3 in progress

Wiring install.sh. Key anchor findings:
- Array names are DESCS (not DESCRIPTIONS) and DIRS (not SOURCES) and FILES (not FILES_LISTED).
- PICKS=(1 1 1 1 1 1 1 1 1 1 1 1 1) - 13 entries; must become 14.
- sidecoach has no status-check case (falls to default) and no deactivate case - task-list gets both.
- Post-install summary (line 2298) ends at reflect; sidecoach has no summary line either.
- Usage doc string at line 234 lists only up to reflect (not sidecoach).
- All 11 edits done. bash -n passes. task-list appears at lines: 19, 56, 71, 87, 116-117, 133, 240, 563, 903, 920, 2225-2233, 2323.
- install.sh: 29 insertions, 4 deletions. Zero emdashes introduced.
- --only task-list installs successfully; diff between source and installed is clean.
- Skill appears in session skill list immediately after install (task-list entry visible in system-reminder).

## Task 3 complete

install.sh modified at lines 19, 56, 71, 87, 116-117, 133, 240, 563, 903, 920, 2225-2233, 2323. bash -n passes with no errors. --only task-list installs cleanly. Source/installed diff is empty.

## Task 4 smoke test in progress

Step 3 done: `add audit hook layer for redundant checks` -> T-0001 in dotfiles area, P2. File now has `## dotfiles > ### Active` section with one task. Last ID comment incremented to T-0001.

Steps 4-5 done: explicit-area adds for sidecoach (T-0002 P1) and improv (T-0003 P1). Verified alphabetical area insertion: dotfiles -> improv -> sidecoach (correct alphabetical order even though IDs landed out of order). Last ID -> T-0003.

Steps 6-8 done (read-only list verbs): `list` shows all 3 grouped by area; `list sidecoach` filters to T-0002; `list --p1` filters to T-0002 and T-0003.

Step 9 done: `block T-0001 waiting on tooling decision` moved T-0001 from `### Active` to `### Blocked` with `[BLOCKED: waiting on tooling decision]` appended. `### Active` empty -> dropped.

Step 10 done (read-only): `list --blocked` shows just T-0001 with BLOCKED tag.

Steps 11-15 done (batched): unblock T-0001 (back to Active, [BLOCKED] stripped); edit T-0001 P0 (priority flipped); edit T-0001 description (text changed, [P0] preserved); done T-0002 (moved to sidecoach > Done, checkbox flipped, (done 2026-05-25) appended); remove T-0003 (line gone, improv Active emptied, improv section dropped entirely - confirms empty-section drop logic).

Step 16: `show` would emit `cmux open /Users/spare3/Documents/Github/claude-dotfiles/TASKS.md` - command form verified, actual cmux open skipped to avoid pane clutter.

Step 17 (hand-edit recovery) skipped in smoke test - documented in SKILL.md, logic is straightforward, not blocking.

**Smoke test summary:** All 8 verbs exercised through their primary paths and key edge cases (alphabetical area insertion, empty-section drop, area-token parsing, priority defaulting, ID monotonic increment, sub-section transitions). No skill-spec deviations encountered.

**Decision needed from Jonah:** Whether to revert TASKS.md to the empty skeleton or keep some of the smoke-test entries as initial backlog. The current entries (T-0001 "audit and trim redundant hook checks" at P0 in dotfiles, T-0002 "wire validator-coverage CLI flag" at P1 done in sidecoach) are reasonable real tasks; T-0003 was already removed.

## Feature delivered (2026-05-25)

Jonah chose reset; TASKS.md reverted to skeleton via `git checkout`. Working tree TASKS.md clean.

Five commits on `main` from spec through wiring:
- `9871ea1` spec(task-list): design global /task-list skill for dotfiles TASKS.md
- `5e89385` chore(tasks): seed TASKS.md skeleton at dotfiles root
- `5b1c21f` feat(task-list): add /task-list skill source
- `086893a` fix(task-list): tighten SKILL.md per review (parse rule, ordering, anchors)
- `2ffc6d2` feat(install): wire /task-list component into install.sh

Net change: TASKS.md (+5), SKILL.md (+123), spec (+121), install.sh (+33-4). Plan file (+~225) and latest memory updates still uncommitted; wrap-up commit pending.

Smoke test outcomes (all verbs PASS): add (cwd-inferred + explicit area + explicit priority), list (all/area/priority), block + unblock (with section drop/recreate), edit (priority + description, preserving other fields), done (with section transition), remove (with empty area drop), show (cmux open form verified).

Skill is loaded in this and future sessions via the dotfiles skill loader.

**Finding:** every TASKS.md write triggers the project-file-dirty memory hook. In real `/task-list add` use, every invocation will require a follow-up memory write or the user will hit the hook. Worth noting for post-smoke-test followup.

## Task 3 verified, Task 4 inline path unlocked

Direct diff inspection on commit `2ffc6d2` confirmed all 10 install.sh touch-points correct. Plan deviation noted: `bash install.sh --status` was referenced in the plan but no `--status` flag exists; functional verification (`--only task-list` + source/installed file diff) is the correct check and is what the implementer used. The skill is now loaded in this session per the system-reminder skills list, so Task 4 smoke testing can run inline instead of being handed off.
