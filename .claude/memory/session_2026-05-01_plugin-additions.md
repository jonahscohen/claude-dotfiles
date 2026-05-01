---
name: Plugin additions to shared settings.json
description: Added feature-dev, ralph-loop, code-review, plugin-developer-toolkit, chrome-devtools plugins and buildwithclaude marketplace to shared config
type: project
---

## Changes

- Added `feature-dev@claude-plugins-official` to shared settings.json (was toggled via /plugin into project settings.local.json, cleaned that up and put it in the right place)
- Added `ralph-loop@claude-plugins-official` to shared settings.json
- Added `code-review@claude-plugins-official` to shared settings.json
- Added `plugin-developer-toolkit@claude-plugins-official` to shared settings.json
- Added `chrome-devtools@claude-plugins-official` to shared settings.json
- `security-guidance@claude-plugins-official` was already present, no change needed
- Added `buildwithclaude` marketplace to `extraKnownMarketplaces` (source: davepoon/buildwithclaude, autoUpdate: true)
- Removed project-level `.claude/settings.local.json` that /plugin toggling had created as debris

All plugins are in the shared `claude/settings.json` so every colleague gets them on pull.

## Self-analysis: missed memory writes

**What happened:** Made 7 discrete changes to settings.json across multiple user requests without writing a single memory entry until called out.

**Why:** The requests were small, structurally identical ("add X to settings.json"), and arrived in rapid succession. I mentally categorized them as "one ongoing task" rather than 7 discrete completed tasks. The Memory Discipline rule says "per-task, not per-feature" but my pattern-matching treated the whole batch as one feature ("plugin setup").

**How it went wrong:** The trigger for memory writes is task completion, not task complexity. A one-line edit that's done is still done and still gets recorded. I optimized for throughput (fast responses) over discipline (record each change). The rapid-fire cadence made batching feel natural, which is exactly when the rule matters most - when it feels unnecessary is when you're most likely to skip it.

**Fix:** Treat every user request that results in a file change as a discrete task boundary, regardless of how small or similar it is to the previous one.

## Files touched

- claude/settings.json

Collaborator: Jonah
