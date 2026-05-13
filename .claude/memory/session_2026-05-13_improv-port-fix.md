---
name: improv-port-fix
description: Port 9223 is correct for improv WS; browser settings showing 3901 was toolbar config, not WS port; reverted premature change
type: project
relates_to: [session_2026-05-13_improv-claude-connection.md, session_2026-05-13_improv-server-resilience.md]
---

## Improv port investigation - 2026-05-13

Collaborator: Jonah

**Issue:** Browser settings panel showed port 3901 / Connected. Assumed port mismatch with server (9223). Changed all files to 3901.

**Reality:** Port 9223 is the correct WebSocket port. The 3901 in the browser settings panel comes from `toolbar.ts:51` and is a separate config (toolbar port), not the WS connection port. After MCP reset, `improv_status` confirmed browser connected on 9223 with active connection.

**Action:** Reverted all 7 files back to 9223. No net changes.

**Lesson:** The earlier watch failures were due to MCP server disconnect/reconnect, not port mismatch. The browser reconnected fine on 9223 once the server was stable.
