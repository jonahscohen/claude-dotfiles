---
name: T-0025 containerized Python REPL MCP tool shipped
description: sidecoach MCP server gains sidecoach_python_repl_execute - docker-sandboxed one-shot Python with two-layer defense (static AST screen + container isolation); 254/254 tests, live round-trip verified
type: project
relates_to: [session_2026-05-28_t0022_mcp_extension_shipped.md, session_2026-05-28_t0026_lsp_subsystem.md, session_2026-05-28_task-queue-team-deploy.md]
---

Collaborator: Jonah. Shipped by teammate `t0025-pyrepl-v2` (task-queue-0528), verified + integrated by lead. Closes the Python-REPL deferral filed during T-0022. (The first `t0025-pyrepl` agent wedged on a thinking-block API error and produced nothing; re-spawned fresh against the T-0026-committed tree - see [[feedback_agent_worktree_isolation_unreliable]] for the coordination story.)

## What shipped
New tool `sidecoach_python_repl_execute` - one-shot Python inside a locked-down container. Two-layer defense-in-depth:
- Layer 1 (static screen, `src/python-ast-check.ts`): rejects `import os/subprocess/socket` (incl. dotted + comma + from-import forms), `__import__`, `eval`, `exec`, `compile`, `getattr` on `__builtins__`, and bare `__builtins__` access, as INVALID_INPUT BEFORE any container starts.
- Layer 2 (container, `src/python-sandbox.ts`): `docker run --rm -i --network none --memory 256m --cpus 0.5 --read-only --tmpfs /tmp:size=64m --user nobody <image> python3 -` with code streamed via stdin. Image `python:3-slim`, overridable via `SIDECOACH_PYTHON_IMAGE`. Pure argv (no shell metacharacters/interpolation). docker/podman probe-and-cache; neither present -> DOWNSTREAM_UNAVAILABLE. Hard 10s container-kill timeout (default; arg `timeoutMs` 100..10000), bounded below the per-tool 30s budget. Output capped 64 KiB.

## Quality bar preserved (T-0018/T-0022/T-0026)
Zod `pythonReplExecuteShape` (code 1..262144, timeoutMs 100..10000) validates before handler; uniform wrapHandler guard; 5-code taxonomy; logger byte-counts only. AST-check + docker-arg builder factored into pure modules so they unit-test without the server. // T-0025 markers added alongside (not disturbing) the committed // T-0026 LSP entries in schemas.ts + tools/index.ts.

## Tests: 254/254 PASS (was 204 after T-0026, +50)
- Unit (python-ast-check): reject for every forbidden pattern + accept for math/arithmetic. (python-sandbox): buildDockerArgs asserts the EXACT security flags, run --rm -i ordering, image-before-`python3 -`, no shell metacharacters, image default + env override, timeout bounded below 30s.
- Fault-injection (python-repl-faults): empty PATH -> DOWNSTREAM_UNAVAILABLE; sandbox-escape screen rejects (os/subprocess/socket/__import__/eval/exec/compile/getattr-builtins) -> INVALID_INPUT with no container spawned; timeout busy-loop hard-killed (not a hang); OOM >256m killed + surfaced; network egress via urllib blocked by --network none.
- Integration (python-repl): DOWNSTREAM when no runtime; forbidden-import screen (always-on); LIVE `print(2+2)` -> "4" and live network-egress-blocked (run when daemon up, skip-logged when down).
- tsc clean, dist rebuilt.

## Live verification (lead, independent)
Docker 27.4.0 daemon UP. Ran `__tests__/smoke-t0025.sh` myself: tools/list shows 21 tools incl. the new one; LIVE `print(2+2)` -> stdout "4\n", exitCode 0, runtime "docker", 276ms (a FRESH run - durationMs differs from the agent's captured 326ms, proving real new container execution not a replay); `import os` rejected by static screen in 15ms before any container; `urllib` allowed past the screen but egress BLOCKED by --network none ("BLOCKED: URLError"), proving layer 2 enforces even when layer 1 passes; empty code -> schema reject. Defense-in-depth demonstrated at both layers.

## Files
- NEW src/{python-ast-check.ts, python-sandbox.ts, tools/python-repl-execute.ts}
- MOD src/{schemas.ts, tools/index.ts} (additive // T-0025)
- NEW __tests__/{unit/python-ast-check.test.ts, unit/python-sandbox.test.ts, integration/python-repl.test.ts, fault-injection/python-repl-faults.test.ts, smoke-t0025.sh}
- MOD __tests__/{unit/schemas.test.ts, SMOKE_TRANSCRIPT.txt (T-0025 section appended), integration/stdio-transcript.txt (regenerated, 21 tools)}
- MOD DESIGN-EXTENSION.md (T-0025 section), README.md (tool catalog + docker requirement + image env var)
- dist/ rebuilt
