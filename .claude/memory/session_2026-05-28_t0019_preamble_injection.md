---
name: T-0019 preamble injection hook (2026-05-28)
description: SessionStart + PostCompact hook that auto-prepends PRODUCT.md + DESIGN.md to every session as additionalContext, closing OMC gap #1
type: project
relates_to: [session_2026-05-28_t0018_mcp_server.md, session_2026-05-28_t0008_sidecoach_keyword_hook.md]
---

# T-0019 preamble injection hook (Jonah, 2026-05-28)

## What

Closed OMC research gap #1 - design context (PRODUCT.md + DESIGN.md) is now
auto-prepended to every session, not just to sessions that explicitly invoke
a sidecoach flow. Implemented via a SessionStart + PostCompact hook that
runs on every session boot and on every compaction.

## Why

Per the 2026-05-28 OMC research synthesis, sidecoach required an explicit
flow invocation to load PRODUCT.md/DESIGN.md context. A user typing "build
a card component" without invoking `/sidecoach craft` got no design-system
grounding. OMC's preamble injection eliminates that gap. We needed parity.

## How

New file `claude/hooks/sidecoach-preamble.sh` (bash entry + python3 body):

1. Reads SESSION_CWD env var. Falls back to the `cwd` field on stdin JSON
   (some hook events supply it), falls back to `$(pwd)` as last resort.
2. Looks for `<CWD>/PRODUCT.md` and `<CWD>/DESIGN.md` at project root.
3. Validates each file:
   - Must exist and be a regular file (`os.path.isfile` follows symlinks)
   - Size on disk <= 1MB (defensive against binary blobs)
   - Less than 1% NUL bytes after read (binary detection)
   - Stripped content length > 200 chars (the sidecoach project-setup gate)
   - No `[TODO]` marker present (the existing stub-detection convention)
4. Enforces size caps:
   - 4KB per file (truncate with `...[truncated]` marker)
   - 8KB combined payload (final defense-in-depth)
5. Emits the canonical hook JSON:

       {
         "hookSpecificOutput": {
           "hookEventName": "SessionStart",
           "additionalContext": "Project design context loaded from PRODUCT.md + DESIGN.md. Honor the register, brand personality, design tokens, and anti-references on every prompt, not just sidecoach flow invocations.\n\n=== PRODUCT.md ===\n<content>\n\n=== DESIGN.md ===\n<content>"
         }
       }

6. Silent skip (`{}`) on any validation failure. No flag files. No state.

## Wiring

- `claude/settings.json` `hooks.SessionStart` - added after sidecoach-sessionstart
  so the daemon spawns first (its 0-byte fast path isn't affected).
- `claude/settings.json` `hooks.PostCompact` - added so context survives
  compactions (the whole point of an injection hook is "every turn that gets
  fresh context", and compactions are the other moment that happens).
- `install.sh` - the for-loop at line 2260 that symlinks sidecoach hooks now
  includes sidecoach-preamble.sh.
- Local symlinks: `~/.claude/hooks/sidecoach-preamble.sh` and
  `~/.claude/hooks/test-sidecoach-preamble.sh` (so the running install picks
  up the new hook without re-running install.sh).

## Guardrails Met

| Guardrail | Implementation |
|---|---|
| 8KB total cap | 4KB per file truncate + 8KB+512 combined re-cap |
| Silent skip on missing/stub | All paths emit `{}` exactly |
| Idempotent | Read-only. Zero writes. No flag files. |
| Project-scoped | Both files must exist at SESSION_CWD root |
| Binary defense | 1MB disk cap + 1% NUL byte ceiling + UTF-8 BOM strip |

## Tests

`claude/hooks/test-sidecoach-preamble.sh` - 13/13 PASS:

1. Both PRODUCT.md and DESIGN.md valid -> fires
2. PRODUCT.md missing -> silent {}
3. DESIGN.md missing -> silent {}
4. PRODUCT.md is [TODO] stub -> silent {}
5. DESIGN.md is [TODO] stub -> silent {}
6. PRODUCT.md < 200 chars -> silent {}
7. DESIGN.md < 200 chars -> silent {}
8. Combined > 8KB -> truncates with `...[truncated]` marker
9. SESSION_CWD points at empty dir -> silent {}
10. SESSION_CWD points at non-existent path -> silent {}
11. Binary-looking PRODUCT.md (NUL-heavy) -> silent {}
12. cwd resolved from stdin `cwd` field (no SESSION_CWD) -> fires
13. Whitespace-only PRODUCT.md (300 newlines, 0 content) -> silent {}

## Smoke Test (live, this project)

The dotfiles repo root does NOT have PRODUCT.md/DESIGN.md (they live in
subprojects), so I smoke-tested both branches:

- `SESSION_CWD=/Users/spare3/Documents/Github/claude-dotfiles/marketing-site`:
  emitted 5422-char `additionalContext` containing both files with
  `...[truncated]` marker on the DESIGN.md side (the 8.7KB DESIGN.md was
  capped at 4KB).
- `SESSION_CWD=/Users/spare3/Documents/Github/claude-dotfiles` (no files at
  root): correctly emitted `{}`.

The hook is now active in this very session for any project whose CWD
contains both files.

## Edge Cases Handled (not in brief, caught defensively)

- **Binary PRODUCT.md**: any file with >1% NUL bytes is rejected even if it
  passes the 200-char threshold. Test 11 covers this.
- **Symlinks**: `os.path.isfile()` follows them, so a symlink to a valid
  PRODUCT.md in another directory works correctly. Intentional.
- **UTF-8 BOM**: stripped before length check so files saved by Windows
  editors aren't penalized.
- **stdin cwd fallback**: SessionStart events on some Claude Code versions
  carry a `cwd` field in stdin JSON. The hook prefers SESSION_CWD env (set
  explicitly in settings.json) but falls back to stdin to be resilient.
- **>1MB file**: rejected to avoid pathological cases (huge accidental
  paste, log file misnamed). 1MB is way above any realistic PRODUCT.md.

## Files Touched

- `claude/hooks/sidecoach-preamble.sh` (new, 105 lines)
- `claude/hooks/test-sidecoach-preamble.sh` (new, 240 lines)
- `claude/settings.json` (added SessionStart + PostCompact entries)
- `install.sh` (added sidecoach-preamble.sh to symlink loop)
- `TASKS.md` (filed T-0019 done)
- `~/.claude/hooks/sidecoach-preamble.sh` (symlink to dotfiles source)
- `~/.claude/hooks/test-sidecoach-preamble.sh` (symlink to dotfiles source)
