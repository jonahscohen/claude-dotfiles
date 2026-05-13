---
name: Improv loop Phase 1 deployed
description: Watch agent + improv_respond tool + browser response toast built and deployed
type: project
relates_to: [session_2026-05-13_improv-claude-connection.md, session_2026-05-12_improv-source-reconstruction.md]
---

Phase 1 of the improv-claude loop implemented by Claude Agents (worktree), merged to main manually.

**What was built:**

Server (mcp-tools.ts):
- Prompt IDs: `prompt-1`, `prompt-2`, etc. assigned on `push_prompt`
- `improv_watch` now detects new prompts (was only changes/annotations)
- `improv_get_prompts` clears buffer after read and prefixes with `[prompt-N]`
- New `improv_respond` tool: accepts promptId, summary, filesChanged, changes[], status, question; broadcasts `improv_response` to browser

Browser (core/index.ts):
- `_changeHistory` array on ImprovCore
- Loads history from `localStorage('improv-change-history')` on init
- Listens for `improv_response` WebSocket events, stores in history + localStorage
- `_showResponseToast(message, status)`: green check for completed, info for needsInfo, red X for failed

Skill (~/.claude/skills/improv/SKILL.md):
- Watch loop instructions for Claude agent/goal
- Updated MCP tools table

**Verified:** Browser loads with `_changeHistory` and `_showResponseToast` present, transport connected.

**Verified end-to-end (Ralph loop iteration 1):**
- Server restarted (killed old PID from May 4, new process picked up compiled code)
- push_prompt returns promptId (prompt-1, prompt-2, etc.) - confirmed
- improv_response listener stores to _changeHistory + localStorage - confirmed
- Persistence survives page reload - confirmed
- All three status paths work: completed, needsInfo (with question), failed
- Toast displays and auto-dismisses - confirmed
- Committed and pushed to remote (aef9c7e)

**Remaining per spec:**
- Phase 2: Claude button + changes panel UI
- Phase 3: Element highlights + live feedback
- Phase 4: Live preview via PreviewEngine
- Keyboard shortcuts (P, M, C, Q, J, K, D, R)
- ARIA accessibility attributes
- Watch loop agent needs real-world test (requires Claude Agents session with improv MCP tools loaded)

**Files touched:**
- improv/server/mcp-tools.ts
- improv/core/index.ts
- ~/.claude/skills/improv/SKILL.md
