---
name: Sidecoach vs OMC gap analysis (2026-05-25)
description: Pattern-by-pattern comparison of sidecoach against oh-my-claudecode; top gaps ranked by value
type: reference
relates_to: [session_2026-05-23_sidecoach_100_complete.md, session_2026-05-22_phase4_completion_final.md]
---

Structured gap analysis requested by Jonah. Read-only codebase walk of sidecoach src/.

Key findings:
- Sidecoach has no model-tier routing (single implicit model everywhere except persona-engine.ts which hard-codes claude-opus-4-5)
- Sidecoach has no agent spawning, no tmux workers, no cross-AI orchestration
- Sidecoach has no custom MCP server - runs as a CLI binary via bin/sidecoach-monitor.js
- Sidecoach has strong persistent state: CheckpointStore (.claude/checkpoints/), SessionMemoryWriter, FlowHistoryStore
- Sidecoach has 78 test files (sprint regression naming convention) - strong prompt regression analog
- Sidecoach has no empirical eval harness against real outputs (no SWE-bench analog)
- Sidecoach has no stop-callback/notification system
- Sidecoach distributes as an install.sh component, not a marketplace package

Top gaps (ranked): (1) model-tier routing, (2) custom MCP server, (3) empirical eval harness, (4) stop-callbacks, (5) preamble/agent-persona injection
