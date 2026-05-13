---
name: Improv reply feedback fix
description: Reply input now shows Sending/Sent feedback; errors logged instead of silently caught
type: project
relates_to: [session_2026-05-13_improv-changes-panel.md, decision_improv_shared_prompt_buffer.md]
---

Reply input in changes panel had no visual feedback - user typed, hit Enter, nothing visible happened. Fixed:
- Input shows "Sending..." (disabled, muted) immediately on Enter
- After 300ms shows "Sent" in green
- After 800ms the reply wrap removes
- ImprovCore reply callback logs errors to console instead of silent catch

**Files touched:**
- improv/core/changes-panel.ts (reply feedback)
- improv/core/index.ts (error logging)
