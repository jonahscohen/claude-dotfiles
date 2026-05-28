---
name: T-0022 MCP server dev-tools extension shipped
description: 5 new tools (state_set/get/delete/list_keys + ast_grep) added to sidecoach MCP server with T-0018 quality bar preserved
type: project
relates_to: [session_2026-05-28_t0022_design_checkpoint.md, session_2026-05-28_t0018_mcp_server.md]
supersedes: session_2026-05-28_t0022_design_checkpoint.md
---

T-0022 shipped end-to-end on 2026-05-28 by Jonah. Team-lead approved the design memo (subset: state management + AST grep, defer LSP and Python REPL) and asked for three pre-ship additions: (1) follow-up tasks for the deferrals, (2) explicit SIDECOACH_PROJECT_ROOT docs, (3) smoke-transcript append (not replace). All three addressed.

**Tools shipped (5 new, total now 15):**
- `sidecoach_state_set` - in-process Map write with TTL override (1ms..24h, default 30 min). Caps: key 4 KiB, value 64 KiB, total 1000 entries.
- `sidecoach_state_get` - lazy-expiry read. Missing/expired returns `{value: null}` (not an error).
- `sidecoach_state_delete` - idempotent drop. Missing key returns `{deleted: false}`.
- `sidecoach_state_list_keys` - prefix-filtered enumeration, capped at 100 per call with `totalMatches` + `truncated` flags.
- `sidecoach_ast_grep` - shells to `ast-grep` CLI via execFile, 10s AbortController timeout, max 100 matches, per-match 500-char text cap with `...[truncated]` suffix. Path scoped within SIDECOACH_PROJECT_ROOT (defaults to cwd). DEPENDENCY_MISSING returned as DOWNSTREAM_UNAVAILABLE if binary not on PATH (probed at first call, cached per-process).

**T-0018 quality bar preserved:**
- Zod schemas validate before handler body (key/value caps, TTL bounds, language enum, pattern length, maxResults cap).
- Uniform error guard wraps every handler (try/catch -> structured ToolError).
- Per-tool timeouts (5s for state tools, 10s for ast_grep).
- StoreError -> ToolError mapping covers all 4 store error codes (INVALID_INPUT for caller errors, VALIDATOR_FAILURE for TOO_MANY_ENTRIES runtime cap).
- Path scoping via realpath + relative-prefix-check defends against `..` escape, absolute `/etc` escape, and symlink-to-outside escape (all covered by unit tests).
- No shared mutable state across handlers - only the state-store Map, which sweeps expired entries on every mutating write and on listKeys.

**Test results: 145/145 PASS** (vs 79/79 baseline from T-0018).
- Unit 115 (was 63): added state-store 21, ast-grep-parser 9, project-root 9, schemas +8, tools +6 (5 state-tool happy paths + 1 ast_grep-missing-binary). Pre-existing unit suites unchanged.
- Integration 11 (was 6): added state-and-ast 5 (set-list-get-delete round-trip, overwrite, oversize-key, ast-grep DOWNSTREAM_UNAVAILABLE, ast-grep happy path against this repo with real binary). stdio.test.ts now exercises all 4 state tools end-to-end via subprocess.
- Fault-injection 19 (was 10): added state-store-faults 5 (TOO_MANY_ENTRIES, INVALID_TTL via handler, lazy TTL real-clock expiry, post-reset empty, oversize prefix) + ast-grep-faults 4 (empty PATH -> DOWNSTREAM_UNAVAILABLE, path escape, missing PROJECT_ROOT, absolute in-root path passes validator).

**Live smoke transcript captured.** Appended (not replaced) to `__tests__/SMOKE_TRANSCRIPT.txt` under a "T-0022 EXTENSION" header. Shows: tools/list now returns 15 tools, state set->list->get->delete round-trip, ast_grep finding 15 `export const definition` matches in 163ms against src/tools, oversize-key schema rejection landing as a structured isError. Driver: `__tests__/smoke-t0022.sh` (new).

**Deferrals filed as follow-up tasks** per team-lead ask:
- T-0025 [P3] Python REPL containerized variant (Docker required, all 7 sandbox requirements met)
- T-0026 [P3] LSP integration subsystem (~600 LOC, per-language-server lifecycle)

Both filed but not built. Rationale lives in the design memo (DESIGN-EXTENSION.md sections 3a + 3b).

**Files touched:**

NEW (src/):
- `state-store.ts` - StateStore class with Clock seam, all 4 StoreError codes, lazy expiry + sweep semantics.
- `project-root.ts` - resolveProjectRoot + validatePathInRoot. realpathBestEffort handles "path doesn't exist yet" without losing symlink protection.
- `ast-grep-parser.ts` - parseAstGrepStream for `--json=stream`. Separated from tool handler for unit testability.
- `tools/state-set.ts`, `tools/state-get.ts`, `tools/state-delete.ts`, `tools/state-list-keys.ts`, `tools/ast-grep.ts` - 5 new tool files.

MODIFIED (src/):
- `schemas.ts` - 5 new Zod shapes (stateSetShape, stateGetShape, stateDeleteShape, stateListKeysShape, astGrepShape) + entries in TOOL_INPUT_SCHEMAS.
- `tools/index.ts` - 5 new TOOLS array entries with T-0022 marker comment.

NEW (__tests__/):
- `unit/state-store.test.ts` - 21 tests
- `unit/ast-grep-parser.test.ts` - 9 tests
- `unit/project-root.test.ts` - 9 tests (real temp dirs + symlinks)
- `integration/state-and-ast.test.ts` - 5 tests via in-memory transport
- `fault-injection/state-store-faults.test.ts` - 5 tests
- `fault-injection/ast-grep-faults.test.ts` - 4 tests
- `smoke-t0022.sh` - live JSON-RPC exchange against the 5 new tools

MODIFIED (__tests__/):
- `unit/schemas.test.ts` - 8 new T-0022 schema cases
- `unit/tools.test.ts` - 6 new state + ast_grep handler cases (with _resetAstGrepProbe seam)
- `integration/in-memory.test.ts` - test title updated ("10 tools" -> "all tools")
- `integration/stdio.test.ts` - elastic tool-count check + 4 new state-tool subprocess calls
- `SMOKE_TRANSCRIPT.txt` - appended T-0022 extension transcript section

DOCS:
- `DESIGN.md` - 10 new failure-mode rows (#19-#28) covering state-store + ast-grep failure surface. Final review checklist count updated 18 -> 28.
- `DESIGN-EXTENSION.md` - design memo (created during the checkpoint phase).
- `README.md` - SIDECOACH_PROJECT_ROOT env-var row (default + explicit override behavior + INVALID_INPUT on misconfig). 5 new tool sections under "Tool catalog" (each with input/output/errors/timeout + a T-0022 marker).

TASKS:
- TASKS.md - T-0022 entry under sidecoach Active + 2 deferral follow-ups (T-0025 Python REPL containerized, T-0026 LSP subsystem). Last ID bumped to T-0026.

**Out of scope / not touched:**
- Existing 10 T-0018 tool files (extended via the registry, not modified).
- T-0018's errors.ts, logger.ts, registries.ts, server.ts (state-store and ast-grep tools plug in via existing primitives, no refactor).
- sidecoach/src/* (parent package untouched).

**Quality observations:**
- The state-store's TOO_MANY_ENTRIES path was the only runtime cap I had to wire (the other 3 store errors map 1:1 from Zod). Mapping store-code -> tool-code is in each tool file's catch block; if a future tool wants a different mapping, it controls its own behavior.
- The ast-grep CLI probe caches its result per-process. Test seam `_resetAstGrepProbe` exists for tests that need to flip PATH between cases. Production never calls it.
- Symlink escape protection uses `fs.realpathSync.native` (the native binding, faster + more accurate than the JS shim). The `realpathBestEffort` helper handles paths that don't exist yet by walking up to the deepest existing ancestor and realpathing THAT, then re-attaching the missing tail.
- I held the line on Python REPL despite team-lead naming it as one of the 4 OMC tools. The brief's sandbox requirements list was specific and the cross-platform reality is that 4 of 7 met portably is "flimsy" per their own definition. Filing T-0025 as a containerized variant keeps the door open without shipping a half-measure.

End of beat.
