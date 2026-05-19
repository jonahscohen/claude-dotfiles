---
name: Improv Claudebar architecture
description: Claudebar as separate pill with state machine, bar tray layout, server-side persistence, and Spark sprite animations
type: decision
relates_to: [session_2026-05-14_dishplayscapes-improv.md, session_2026-05-13_improv-punchlist.md, session_2026-05-13_improv-postmortem.md]
---

Claudebar is a separate pill from the queuebar, both held in a flex tray at bottom-left. Claudebar shows Claude's processing state with animated Spark sprites extracted from the Claude desktop app.

**Alternatives considered:**
- Claude indicator inside toolbar pill: rejected because toolbar is mode-switching UI, not status feedback. Mixing concerns caused confusion in earlier iterations.
- Toast notifications: rejected because they're transient and don't allow interaction (click to review, retry on failure).
- Claude button inside queuebar pill: tried and failed - created duplicate element bugs, stale closure references, and couldn't independently animate.

**Why separate pills in a flex tray:** Each pill has independent lifecycle (Claudebar appears only when Claude is processing, queuebar only when queue has items or prompt mode is active). Flex tray handles layout without fixed-position collision. Mutual panel exclusion (opening one closes the other) keeps the UI clean.

**State machine:**
- `none` - no pill visible
- `sending` - pill appears, thinking sprite, "Sending to Claude..." label, animated dots
- `working` - shimmer sprite, "Working..." label, animated dots (triggered by real `improv_working` server event)
- `review` - waiting sprite, "Review Changes" label, pulsing glow border, clickable (opens changes panel)
- `review-active` - changes panel open, glow stops
- `retry` - Lucide redo icon, "Retry Send" label, pulsing glow, clickable (re-sends _lastPromptData)
- `retrying` - shimmer sprite, "Retrying..." label, animated dots, new 60s timeout

**Key design choices:**
- Spark sprites are real assets from Claude desktop app, not approximations. Web Animations API for playback.
- Server-side state persistence (`/claude-state` endpoint, claude-state.json) survives page reloads.
- 60s timeout before retry state - matches reasonable expectation for Claude processing time.
- Multi-task batching via `_pendingResponses` counter - stays in "Working" until ALL responses arrive from a Send All batch.
- All fake timers removed - real `improv_working` WebSocket event from server is the only trigger for sending->working transition.

**Revisit when:** If Claudebar needs to show per-task progress during batch sends (currently just shows "Working" until all done), or if the state machine needs intermediate states for partial completion.
