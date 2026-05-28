---
name: task-queue-0528 team deploy (T-0006, T-0014, T-0025, T-0026)
description: Deployed a 4-teammate worktree-isolated team to work the four open dotfiles/sidecoach tasks in parallel; lead integrates + writes beats + commits
type: project
relates_to: [session_2026-05-28_t0018_mcp_server.md, session_2026-05-28_t0022_mcp_extension_shipped.md, session_2026-05-28_commit-batching.md]
---

Collaborator: Jonah

Jonah said "t-0006, t-0026, t-0025, t-0014 are good to queue up for work, deploy a team." Explicit team opt-in. Spawned team `task-queue-0528` (4 general-purpose teammates, each `isolation: worktree`, `run_in_background: true`).

## Roster + ownership (one task each)
- `t0006-fixgate` (sonnet) - T-0006: fix `claude/hooks/second-fix-gate.sh` EXEMPT list to also match no-leading-dot source paths (`claude/hooks/`, `claude/skills/`). Mechanical 2-line fix + verify.
- `t0014-cli` (opus) - T-0014: build `sidecoach/bin/sidecoach.js` terminal CLI mirroring the `/sidecoach` verb surface; reuse the verb->flow source of truth (do not duplicate), wire install.sh symlink.
- `t0025-pyrepl` (opus) - T-0025: containerized Python REPL MCP tool `sidecoach_python_repl_execute` (docker/podman, `--network none --memory 256m --cpus 0.5 --read-only --tmpfs /tmp --user nobody`, AST pre-reject, hard-kill timeout, DOWNSTREAM_UNAVAILABLE when no container runtime).
- `t0026-lsp` (opus) - T-0026: LSP subsystem `src/lsp/` (client/servers/manager, lease-based concurrency) + 5 tools (hover/goto_definition/find_references/document_symbols/workspace_symbols).

## Why worktrees + lead-integrates
T-0025 and T-0026 both edit the SAME shared MCP files (`schemas.ts`, `tools/index.ts`, `README.md`, `DESIGN-EXTENSION.md`, `SMOKE_TRANSCRIPT.txt`). Parallel edits in one tree would race. Each teammate gets an isolated worktree and marks every shared-file addition with a `// T-0025` / `// T-0026` marker comment so I can merge both additively. Teammates do NOT commit and do NOT write beats (worktree copies of `.claude/memory` would conflict on MEMORY.md). They return structured summaries; I integrate sequentially, resolve the T-0025<->T-0026 conflicts on shared files, write the per-task beats, update TASKS.md closures, and commit.

## Quality bar enforced in prompts
All MCP work must preserve the T-0018/T-0022 bar: Zod schema before handler body, uniform `wrapHandler` guard (try/catch -> structured ToolError + timeout race + stderr-only logging), 5-code error taxonomy, binary-probe-and-cache graceful degradation, path scoping via `project-root.ts`, and unit + integration + fault-injection tests on top of the 145/145 baseline. Each prompt demands tsc clean + full test pass + a smoke transcript append before reporting done.

## Status
Spawned, running in background. Awaiting completion messages.
