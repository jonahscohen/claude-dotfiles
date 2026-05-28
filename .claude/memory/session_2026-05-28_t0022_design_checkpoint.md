---
name: T-0022 MCP dev-tools extension design checkpoint
description: Step 0 research done, design memo written, awaiting team-lead approval before implementation
type: project
relates_to: [session_2026-05-28_t0018_mcp_server.md, session_2026-05-28_omc-research-synthesis.md]
superseded_by: session_2026-05-28_t0022_mcp_extension_shipped.md
---

T-0022 filed. Closes OMC gap #4 - extends T-0018's sidecoach MCP server with OMC-grade dev tools. Step 0 (research + design memo + team-lead checkpoint) done by Jonah on 2026-05-28; implementation paused per the brief's "WAIT FOR APPROVAL" gate.

**Step 0 research findings.** OMC's MCP server lives at `oh-my-claudecode/src/mcp/` plus the actual tool implementations at `oh-my-claudecode/src/tools/`. Four candidate tools identified:
- `src/tools/ast-tools.ts` - ast-grep search + replace via `@ast-grep/napi` native binding, path restricted via `OMC_RESTRICT_TOOL_PATHS`, language-typed for 17 languages, bounded match count + context lines + max files.
- `src/tools/lsp-tools.ts` - 5 LSP tools (hover, goto-def, find-references, document-symbols, workspace-symbols) using `lspClientManager` with per-file-type server discovery, lease-based concurrency, idle eviction. Substantial - ~600 LOC of LSP-protocol plumbing.
- `src/tools/python-repl/tool.ts` - persistent JSON-RPC bridge over Unix socket, namespace-persistent, 5-min default timeout, memory tracking, session locking, signal-escalation interrupt. Even MORE substantial.
- `src/tools/state-tools.ts` - filesystem-backed mode state for OMC's own execution modes (autopilot, ralph, team, etc.). Orthogonal to the brief's "in-process Map" spec - so the brief's spec is the canonical instruction, not OMC's implementation.

**Decision (subset for v1):**
- SHIP: State management (4 tools: state_set/get/delete/list_keys, in-process Map with TTL + caps).
- SHIP: AST grep (1 tool: ast_grep, search-only, shells to CLI not napi, DEPENDENCY_MISSING if not on PATH).
- DEFER: LSP - cannot harden to T-0018's bar in this timeframe (~600 LOC subsystem + whole new failure-mode class). If team-lead overrides, T-0014 or T-0021 swaps out.
- REJECT: Python REPL - cross-platform sandboxing burden (no portable memory cap, no portable network-egress block; macOS sandbox-exec deprecated). Would meet only 4 of 7 sandbox requirements - violates user's "if you can't deliver all, DON'T ship it" gate. T-0022b filed as a future Docker-required containerized variant.

**Why CLI not napi for ast-grep:** keeps sidecoach MCP server's "zero native deps" property; graceful degradation is cleaner (PATH probe at startup, DOWNSTREAM_UNAVAILABLE on first call if missing) than a require-time native-binding error.

**Why search-only for ast-grep:** replace is a write surface that adds disproportionate test burden (byte-perfect surrounding preservation, encoding correctness, dryRun semantics) and the team-lead brief's stated use cases ("find every call to function X") are search-shaped.

**Design memo:** `sidecoach/mcp-server/DESIGN-EXTENSION.md` (~250 lines, 8 sections: mandate, tools chosen, tools rejected with reasons, schemas, failure modes table extending DESIGN.md Section 5, test plan targeting +30 = 109 total, open questions, backout plan).

**Test plan (extension):**
- Unit +18: state-store round-trip / expiry-on-access / sweep / list-keys+prefix / 3 overflow rejections / delete-missing / get-after-delete / get-expired / list-cap; ast-grep JSON parsing (4 cases); schemas (4 new).
- Integration +6: 4 state tools cross-tool interaction; ast_grep against sidecoach repo + DOWNSTREAM_UNAVAILABLE path.
- Fault-injection +6: state overflow (3 paths), state TTL expiry, ast-grep missing binary, ast-grep timeout.

**Checkpoint message sent to team-lead.** Subject: "T-0022 design memo checkpoint." Body includes subset chosen + sandbox model summary + test plan + backout plan + the LSP/REPL override branches if team-lead disagrees. Awaiting reply (approve / revise / override) before any implementation.

**Files touched:**
- TASKS.md - added T-0022 row under sidecoach / Active (Last ID was bumped to T-0024 by parallel work; my entry slotted between T-0014 and T-0023)
- sidecoach/mcp-server/DESIGN-EXTENSION.md - new memo, 8 sections

**Out of scope until approval:**
- src/tools/state-{set,get,delete,list-keys}.ts (4 new tool files)
- src/tools/ast-grep.ts (1 new tool file)
- src/schemas.ts (4 new shapes)
- src/tools/index.ts (5 new TOOLS entries)
- All test files
- README + DESIGN.md failure-modes table updates
