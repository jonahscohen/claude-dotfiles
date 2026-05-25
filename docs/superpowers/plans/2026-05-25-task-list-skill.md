# /task-list skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a global `/task-list` slash-command skill that manages a single git-synced `TASKS.md` at the dotfiles repo root, with verbs add/list/done/edit/remove/block/unblock/show.

**Architecture:** A pure-markdown skill at `~/.claude/skills/task-list/SKILL.md`. The skill file IS the implementation contract: it tells Claude how to parse each verb, infer area from cwd, assign monotonic `T-NNNN` IDs (tracked via a `<!-- Last ID: T-NNNN -->` HTML comment in the file), and route lines between `### Active` / `### Blocked` / `### Done` sub-sections. Always edits the dotfiles `TASKS.md`, never any other repo's file. Installed alongside other skills by `install.sh`.

**Tech Stack:** Markdown skill file; bash install.sh wiring. No runtime code, no tests beyond live invocation - the "test" is running the verb and observing the file change.

**Spec:** `docs/superpowers/specs/2026-05-25-task-list-design.md`

---

## File Structure

Files created:
- `TASKS.md` - the task list itself, at the dotfiles repo root.
- `claude/skills/task-list/SKILL.md` - the skill source, copied into `~/.claude/skills/task-list/SKILL.md` by `install.sh`.

Files modified:
- `install.sh` - new `task-list` component wired into all the standard places (KEYS, TITLES, DESCRIPTIONS, FILES_LISTED, SOURCES, usage doc, status check, install block, deactivate function, post-install summary).

No tests are added. Skills are markdown specs interpreted by Claude at invocation time; there is no unit-test surface. Verification is live invocation of each verb after install, with expected file diffs documented in Task 4.

---

## Task 1: Create initial TASKS.md skeleton at repo root

**Files:**
- Create: `TASKS.md`

- [ ] **Step 1: Write the file**

Create `/Users/spare3/Documents/Github/claude-dotfiles/TASKS.md` with exactly:

```markdown
# Dotfiles tasks

<!-- Managed by /task-list skill. Hand-edits welcome; preserve the structure. -->
<!-- Last ID: T-0000 -->

```

The trailing blank line is intentional - it gives the first `add` a clean insertion point.

- [ ] **Step 2: Verify file content**

Run: `cat TASKS.md`
Expected output:
```
# Dotfiles tasks

<!-- Managed by /task-list skill. Hand-edits welcome; preserve the structure. -->
<!-- Last ID: T-0000 -->

```

- [ ] **Step 3: Commit**

```bash
git add TASKS.md
git commit -m "chore(tasks): seed TASKS.md skeleton at dotfiles root"
```

---

## Task 2: Write the skill source file

**Files:**
- Create: `claude/skills/task-list/SKILL.md`

- [ ] **Step 1: Create the directory**

Run: `mkdir -p claude/skills/task-list`
Expected: directory exists, no output on success.

- [ ] **Step 2: Write SKILL.md**

Create `claude/skills/task-list/SKILL.md` with exactly the content below. The frontmatter `description` is the trigger surface for the skill loader, so it must mention every verb.

````markdown
---
name: task-list
description: Manage the dotfiles TASKS.md. Triggers on `/task-list <verb>` where verb is add, list, done, edit, remove, block, unblock, or show. Always operates on `~/Documents/Github/claude-dotfiles/TASKS.md` only; never touches TASKS.md files in other repos. Forward-looking layer above sprint memory.
---

# /task-list skill

A global, dotfiles-only task list. The single source of truth for "things to do" across every subproject in the dotfiles repo. Forward-looking; sprint memory remains the backward-looking record.

## Target file

**Always and only:** `~/Documents/Github/claude-dotfiles/TASKS.md`.

Do not pick up `TASKS.md` files in other repos. If the dotfiles file does not exist, create it before performing any verb:

```markdown
# Dotfiles tasks

<!-- Managed by /task-list skill. Hand-edits welcome; preserve the structure. -->
<!-- Last ID: T-0000 -->

```

## Verbs

### `add` - `/task-list add [area] [P#] <description>`

1. **Determine area.** If the user passed an area arg, use it. Otherwise infer from cwd:
   - cwd path contains `/sidecoach` -> `sidecoach`
   - cwd path contains `/improv` -> `improv`
   - cwd path contains `/marketing-site` -> `marketing-site`
   - cwd path contains `/test-site-1` -> `test-site-1`
   - anything else -> `dotfiles`
2. **New area confirmation.** If the chosen area does not already appear as `## <area>` in the file AND is not one of the known names above, confirm via AskUserQuestion before creating the section ("Create new area `<name>`?" with options Yes / cancel / pick existing).
3. **Determine priority.** If the user passed `[P0]`, `[P1]`, `[P2]`, or `[P3]`, use it. Default `P2`.
4. **Read** the target file.
5. **Get next ID.** Find `<!-- Last ID: T-NNNN -->`. Increment to `T-(NNNN+1)`, zero-padded to 4 digits.
6. **Locate or create** the area's `## <area>` section, alphabetically ordered against existing areas. Within it, locate or create `### Active`.
7. **Append the task line** at the end of `### Active`:
   ```
   - [ ] T-NNNN [P#] YYYY-MM-DD <description>
   ```
   where YYYY-MM-DD is today.
8. **Update the comment** to `<!-- Last ID: T-NNNN -->` with the new ID.
9. **Report:** `Added T-NNNN to <area> (P#): <description>`.

### `list` - `/task-list list [area] [--done] [--blocked] [--p0|--p1|--p2|--p3]`

1. Read the file.
2. Filter:
   - If `area` given, restrict to that area's section.
   - Default status is `### Active`. `--done` shows only Done. `--blocked` shows only Blocked.
   - If `--p#` given, keep only lines whose priority tag matches.
3. Render as plain text. Group by area when more than one area is shown; preserve sub-section headers; one task per line.

### `done` - `/task-list done T-NNNN`

1. Find the line containing ` T-NNNN ` (with surrounding spaces, anchored).
2. **Not found:** error with `T-NNNN not found. Closest IDs: <up-to-3 nearest used IDs>.`
3. Flip the checkbox: `- [ ]` -> `- [x]`.
4. Append ` (done YYYY-MM-DD)` if not already present.
5. Move the line to the area's `### Done` sub-section (create it if missing, immediately after `### Active` / `### Blocked`).
6. If the source sub-section is now empty, drop the header.

### `edit` - `/task-list edit T-NNNN [P#] [<new description>]`

1. Find the line. Not found -> same error as `done`.
2. If the args include `[P#]`, replace the priority tag.
3. If the args include a description string, replace the description (everything after the created date, up to but not including trailing tags like `[sprint-NN]`, `[BLOCKED: ...]`, or `(done ...)`).
4. Preserve checkbox, ID, created date, and all trailing tags.

### `remove` - `/task-list remove T-NNNN`

1. Find the line. Not found -> same error as `done`.
2. Delete the line entirely.
3. If the resulting sub-section is empty, drop the sub-header. If the resulting area section is empty, drop the area `## <area>` header too.

### `block` - `/task-list block T-NNNN <reason>`

1. Find the line. Not found -> same error as `done`.
2. Append ` [BLOCKED: <reason>]` if no `[BLOCKED: ...]` is present; otherwise replace the existing tag.
3. Move the line to the area's `### Blocked` sub-section (create it if missing, between `### Active` and `### Done`).

### `unblock` - `/task-list unblock T-NNNN`

1. Find the line. Not found -> same error as `done`.
2. Strip the trailing `[BLOCKED: ...]` tag.
3. Move the line back to `### Active`.
4. If `### Blocked` is now empty, drop the header.

### `show` - `/task-list show`

Run, via Bash: `cmux open /Users/spare3/Documents/Github/claude-dotfiles/TASKS.md`. Report `Opened TASKS.md in cmux.`

## Sub-section ordering

Within each `## <area>` section, sub-sections appear in this order when present (omit when empty):

1. `### Active`
2. `### Blocked`
3. `### Done`

## Line schema (strict)

`- [ ] T-NNNN [P#] YYYY-MM-DD <description>[ <optional trailing tags>]`

Optional trailing tags, any order, space-separated:
- `[sprint-NN]` - links to a sprint memory file.
- `[BLOCKED: <reason>]` - present only when the line is in `### Blocked`.
- `(done YYYY-MM-DD)` - present only when the line is in `### Done`.

Checkbox is `- [x]` for done; `- [ ]` otherwise.

## Hand-edit recovery

The skill re-reads the file on every invocation; hand-edits are always honored. The only structural invariant: `Last ID` >= max used `T-NNNN`. If a hand-edit violates this (e.g. the user pasted in `T-9999` directly), the next `add` resets `Last ID` to `max_used + 1` and warns once: `Last ID was stale; reset to T-(max_used+1).`

## Out of scope

- Operating on TASKS.md files outside the dotfiles repo.
- Git operations (push, pull, conflict resolution). Git is the user's job.
- Free-form `#tags`, due dates, estimates, assignment. Hand-edit if you need more.
- A `tasks` shell binary alongside the skill.
````

- [ ] **Step 3: Verify the file**

Run: `wc -l claude/skills/task-list/SKILL.md && head -3 claude/skills/task-list/SKILL.md`
Expected: file exists, has more than 100 lines, head shows the YAML frontmatter `---`, `name: task-list`, `description: Manage the dotfiles TASKS.md...`.

- [ ] **Step 4: Commit**

```bash
git add claude/skills/task-list/SKILL.md
git commit -m "feat(task-list): add /task-list skill source"
```

---

## Task 3: Wire install.sh component

**Files:**
- Modify: `install.sh` (10 separate touch-points, all matching the existing `reflect` pattern)

For each step below, the engineer should look at the corresponding `reflect` reference line as a template, then insert the `task-list` analogue immediately adjacent.

- [ ] **Step 1: Add header comment**

Locate line 18 (`#   reflect      - Memory corpus analysis (reflect skill + nudge hook)`). Add immediately below:

```bash
#   task-list    - Global /task-list slash command + TASKS.md at dotfiles root
```

- [ ] **Step 2: Add to KEYS array**

Locate line 55 (`KEYS=(brain config memory skills statusline cmux nvm ampersand discord voice-input voice-output reflect sidecoach)`). Append `task-list`:

```bash
KEYS=(brain config memory skills statusline cmux nvm ampersand discord voice-input voice-output reflect sidecoach task-list)
```

- [ ] **Step 3: Add TITLES entry**

Locate the TITLES array (the entry for reflect is at line 68: `"Memory corpus analysis (reflect)"`). Append a new entry aligned with the new KEYS slot:

```bash
"Dotfiles task list (/task-list + TASKS.md)"
```

- [ ] **Step 4: Add DESCRIPTIONS entry**

Locate the DESCRIPTIONS array (reflect entry at line 83). Append:

```bash
"Adds the /task-list slash-command skill at ~/.claude/skills/task-list/. Manages a single TASKS.md at the dotfiles repo root, organized by area (sidecoach, improv, marketing-site, test-site-1, dotfiles) with Active/Blocked/Done sub-sections. Verbs: add, list, done, edit, remove, block, unblock, show. Area inferred from cwd; IDs monotonic T-NNNN. Always operates on the dotfiles TASKS.md regardless of where you invoke it from. No hooks, no external deps."
```

- [ ] **Step 5: Add FILES_LISTED entry**

Locate the FILES_LISTED array (reflect entry at lines 109-110). Append a comment and entry:

```bash
  # task-list
  "~/.claude/skills/task-list/SKILL.md"
```

- [ ] **Step 6: Add SOURCES entry**

Locate the SOURCES array (reflect entry around line 126). Append:

```bash
"$REPO_DIR/claude"           # task-list
```

- [ ] **Step 7: Add to usage doc**

Locate the usage doc string (line 234 in the existing reflect listing). Add `task-list` to the comma-separated list of valid `--only` arguments:

```
(brain, config, memory, skills, statusline, cmux, nvm, ampersand, discord, voice-input, voice-output, reflect, task-list)
```

Same change everywhere the comma-list appears (search for `voice-output, reflect` and append `, task-list`).

- [ ] **Step 8: Add status check**

Locate line 556 (`reflect)    [ -f "$CLAUDE_DIR/skills/reflect/SKILL.md" ] && echo active || echo not-installed ;;`). Add immediately below:

```bash
    task-list)  [ -f "$CLAUDE_DIR/skills/task-list/SKILL.md" ] && echo active || echo not-installed ;;
```

- [ ] **Step 9: Add deactivate function and dispatcher case**

Locate the `deactivate_reflect` function (lines 889-892). Add a new function immediately after:

```bash
deactivate_task_list() {
  [ -d "$CLAUDE_DIR/skills/task-list" ] && rm -rf "$CLAUDE_DIR/skills/task-list"
}
```

Locate the deactivate dispatcher (line 908, `reflect)    deactivate_reflect ;;`). Add immediately below:

```bash
    task-list)  deactivate_task_list ;;
```

- [ ] **Step 10: Add install block**

Locate the reflect install block (lines 2186-2208, starts with `if picked reflect; then`). Add immediately after that block's closing `fi`:

```bash
if picked task-list; then
  info "Installing /task-list skill..."
  mkdir -p "$CLAUDE_DIR/skills/task-list"
  cp "$REPO_DIR/claude/skills/task-list/SKILL.md" \
     "$CLAUDE_DIR/skills/task-list/SKILL.md"
  ok "/task-list skill installed"
fi
```

- [ ] **Step 11: Add post-install summary line**

Locate line 2298 (`picked reflect     && echo "  - Reflect: memory corpus analysis skill + reflect-nudge SessionStart hook"`). Add immediately below:

```bash
picked task-list   && echo "  - Task list: /task-list slash command + TASKS.md at dotfiles root"
```

- [ ] **Step 12: Lint-check install.sh**

Run: `bash -n install.sh`
Expected: no output (syntax OK).

- [ ] **Step 13: Status check**

Run: `bash install.sh --status`
Expected: output includes a `task-list` row showing `not-installed` (it isn't installed yet).

- [ ] **Step 14: Install just this component**

Run: `bash install.sh --only task-list`
Expected: output includes `Installing /task-list skill...` and `/task-list skill installed`.

- [ ] **Step 15: Verify installed file**

Run: `ls -la ~/.claude/skills/task-list/SKILL.md`
Expected: file exists, non-zero size.

Run: `diff claude/skills/task-list/SKILL.md ~/.claude/skills/task-list/SKILL.md`
Expected: no output (files identical).

- [ ] **Step 16: Status check confirms active**

Run: `bash install.sh --status`
Expected: `task-list` row now shows `active`.

- [ ] **Step 17: Commit**

```bash
git add install.sh
git commit -m "feat(install): wire /task-list component into install.sh"
```

---

## Task 4: Smoke-test each verb in a fresh Claude session

This task is **manual interactive verification**. The engineer should start a fresh Claude session (so the new skill is loaded by the skill loader), then run each verb and confirm the expected file diff.

**Prep:**

- [ ] **Step 1: Start a fresh Claude session**

Either close and re-open `claude` or use `/clear` to reset context. Confirm the skill loaded by running `/task-list` with no args: Claude should recognize the slash command and describe its verbs.

- [ ] **Step 2: Confirm starting state**

Run: `cat TASKS.md`
Expected: skeleton from Task 1 (header + Last ID T-0000 comment + blank line).

**Verb: add (inferred area = dotfiles, default priority = P2)**

- [ ] **Step 3: First add from repo root**

Run cwd is repo root. Invoke: `/task-list add audit hook layer for redundant checks`
Expected response: `Added T-0001 to dotfiles (P2): audit hook layer for redundant checks`
Run: `cat TASKS.md`
Expected file content:
```markdown
# Dotfiles tasks

<!-- Managed by /task-list skill. Hand-edits welcome; preserve the structure. -->
<!-- Last ID: T-0001 -->

## dotfiles
### Active
- [ ] T-0001 [P2] 2026-05-25 audit hook layer for redundant checks
```

**Verb: add (inferred area = sidecoach, explicit priority)**

- [ ] **Step 4: Add from sidecoach subdir**

`cd sidecoach && /task-list add P1 wire validator-coverage CLI flag`
Expected response: `Added T-0002 to sidecoach (P1): wire validator-coverage CLI flag`
Expected file diff: new `## sidecoach > ### Active` section appears (alphabetically before `## dotfiles`? - the SKILL.md says alphabetically ordered against existing areas; `dotfiles` < `sidecoach`, so `dotfiles` stays first), and the new line is appended there. `Last ID` is now `T-0002`.

**Verb: add (explicit area override)**

- [ ] **Step 5: Add with explicit area arg**

Run from repo root: `/task-list add improv P1 fix property-panel scroll trap`
Expected response: `Added T-0003 to improv (P1): fix property-panel scroll trap`
Expected file: new `## improv` section appears alphabetically between `## dotfiles` and `## sidecoach`.

**Verb: list**

- [ ] **Step 6: List all active**

Run: `/task-list list`
Expected: all three tasks grouped by area, in alphabetical area order.

- [ ] **Step 7: List one area**

Run: `/task-list list sidecoach`
Expected: only the sidecoach task.

- [ ] **Step 8: List by priority**

Run: `/task-list list --p1`
Expected: T-0002 and T-0003, not T-0001.

**Verb: block**

- [ ] **Step 9: Block a task**

Run: `/task-list block T-0001 waiting on tooling decision`
Expected file diff: T-0001 moves from `## dotfiles > ### Active` to `## dotfiles > ### Blocked`, with ` [BLOCKED: waiting on tooling decision]` appended.

- [ ] **Step 10: List blocked**

Run: `/task-list list --blocked`
Expected: just T-0001.

**Verb: unblock**

- [ ] **Step 11: Unblock**

Run: `/task-list unblock T-0001`
Expected file diff: T-0001 moves back to `### Active`, `[BLOCKED: ...]` tag stripped. If `### Blocked` is now empty, the sub-header is gone.

**Verb: edit**

- [ ] **Step 12: Edit priority**

Run: `/task-list edit T-0001 P0`
Expected file: T-0001's priority tag is now `[P0]`. Description unchanged.

- [ ] **Step 13: Edit description**

Run: `/task-list edit T-0001 audit and trim redundant hook checks`
Expected file: T-0001's description is now `audit and trim redundant hook checks`. Priority tag `[P0]` preserved.

**Verb: done**

- [ ] **Step 14: Mark done**

Run: `/task-list done T-0002`
Expected file diff: T-0002 moves from `## sidecoach > ### Active` to `## sidecoach > ### Done`, checkbox flipped to `[x]`, ` (done 2026-05-25)` appended.

**Verb: remove**

- [ ] **Step 15: Remove a task**

Run: `/task-list remove T-0003`
Expected file diff: T-0003 line gone. If `## improv > ### Active` is now empty, `### Active` header dropped. If `## improv` has no remaining sub-sections, the whole `## improv` section is dropped.

**Verb: show**

- [ ] **Step 16: Show in cmux**

Run: `/task-list show`
Expected: `Opened TASKS.md in cmux.` and a new cmux pane displays the rendered TASKS.md.

**Edge case: hand-edit recovery**

- [ ] **Step 17: Stale Last ID**

Hand-edit `TASKS.md`: change the `<!-- Last ID: T-NNNN -->` comment to `<!-- Last ID: T-0000 -->` while there are still higher IDs in use.

Run: `/task-list add test stale-id recovery`
Expected response: `Added T-(max_used+1) to dotfiles (P2): test stale-id recovery` AND a one-line warning `Last ID was stale; reset to T-(max_used+1).` The new task uses an ID one above the highest currently in the file.

- [ ] **Step 18: Reset for clean commit**

Restore `TASKS.md` to a clean state suitable for committing. Either:
- `git checkout TASKS.md` (discard all the smoke-test tasks)
- Or hand-edit to leave only real tasks worth keeping.

Decide with Jonah which.

- [ ] **Step 19: Commit (only if real tasks were captured)**

If the smoke test produced tasks worth keeping:

```bash
git add TASKS.md
git commit -m "chore(tasks): capture initial dotfiles backlog"
```

Otherwise skip - the skill itself is already committed in Tasks 1-3.

---

## Done criteria

- `TASKS.md` exists at the dotfiles repo root with the documented skeleton.
- `claude/skills/task-list/SKILL.md` exists in the repo and is installed to `~/.claude/skills/task-list/SKILL.md`.
- `install.sh` is updated in all 10 touch-points, `bash -n install.sh` passes, and `bash install.sh --status` shows `task-list` as `active` after install and `not-installed` after `deactivate_task_list`.
- All 8 verbs (add, list, done, edit, remove, block, unblock, show) produce the documented file diffs and responses in Task 4's smoke test.
- The dotfiles repo is in a committable state with at least three new commits (skeleton, skill, install wiring) and optionally a fourth (initial backlog).
