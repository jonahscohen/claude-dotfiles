---
name: "watch justify" wired as an explicit /justify trigger (resume the listen loop, MCP-free)
description: Jonah asked whether manual watch activation is still "watch justify". Yes - but it now triggers ME (Claude) to start the curl /prompts poll loop, not an MCP justify_watch tool (that's gone). Added "watch justify"/"watch"/"start watching"/"start listening" to the /justify skill triggers + a lightweight resume section (precheck daemon+connection, then go straight to the Step 5 listen loop). The in-browser queue hint "Tell Claude `watch justify`" is now accurate again.
type: project
relates_to: [session_2026-06-06_justify-roundtrip-CLOSED.md]
---

Collaborator: Jonah. 2026-06-06.

## Q&A
Q: "what if I want to activate watch manually...still 'watch justify'?"
A: Yes, the phrase still works, but its meaning changed. Old: "watch justify" fired the MCP justify_watch tool. New (MCP-free daemon model): "watch justify" is a natural-language trigger to Claude to start the curl /prompts poll loop. Polling IS the watch now - it marks the session connected (watch-status heartbeat) so the browser releases Send All tasks, AND it's how Claude receives + applies them. The watcher must be Claude polling (a terminal poller could mark "connected" but wouldn't apply edits).

## Change (~/.claude/skills/justify/SKILL.md)
- Added to the skill description triggers: "watch justify" / "watch" / "start watching" / "start listening".
- New section "## watch justify - manually (re)start the listen loop": precheck (status up -> else justify-serve; connections>=1 -> else need full /justify), then enter the Step 5 loop and KEEP polling (active flag expires ~10s after last poll; Send All only shows while actively polling).
- Live skill updated; install.sh heredoc still needs the same (pending durable item, same as the roundtrip-CLOSED beat).

## Files
- ~/.claude/skills/justify/SKILL.md (live; repo install.sh heredoc still to sync).
