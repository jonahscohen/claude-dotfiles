---
name: /justify is THE one command (removed justify-go shim; in-session operative + active listen loop)
description: Jonah (2026-06-05) corrected two things - http://yesand.lndo.site/ is fine (my earlier HTTP 000 was a too-short https-timeout test, not a down site), and he does NOT want a derivative justify-go shim to remember. The original /justify must be the whole thing: a teammate runs /justify in the Claude of their project dir and Justify starts working. Removed justify-go entirely; folded everything into the /justify skill as an in-session bootstrap + active justify_watch listen loop (the session that runs /justify IS the operative).
type: feedback
relates_to: [session_2026-06-05_justify-operative-architecture.md, session_2026-06-05_justify-slash-bootstrap-skill.md]
---

Collaborator: Jonah. 2026-06-05.

## The correction (and my error)
- The yesand site is UP: http://yesand.lndo.site/ works. My "HTTP 000 / site down" was a self-inflicted false alarm - I curled the HTTPS url with -m 5, and the cold cert handshake timed out. http is fine. Lesson: probe http (or a longer timeout) before declaring a Lando site down.
- Jonah does NOT want an extra command ("derivative shim I have to remember"). /justify must be the complete interface. The bar: teammates run /justify in their project's Claude and Justify starts working - nothing else to remember.

## Why the operative-in-another-pane / justify-go design was overbuilt
That architecture solved a problem specific to OUR session: we installed justify mid-session, so THIS session lacks the justify MCP (MCP attaches at session start). A teammate's session, started with justify already installed, HAS the justify MCP from the start - so /justify can do everything in-session. The session that runs /justify IS the operative. No second pane, no second process, no shim.

## What I did this turn
- REMOVED justify-go everywhere: deleted justify/cli/justify-go.sh, ~/.claude/justify/justify-go.sh, the /opt/homebrew/bin/justify-go symlink; reverted the install.sh wiring (cp/chmod/ln). grep confirms 0 justify-go refs in justify/.
- Made /justify self-contained, in BOTH the live ~/.claude/skills/justify/SKILL.md AND the install.sh heredoc (the durable source):
  - Intro now states it runs entirely in THIS session - the Claude session that runs /justify owns the connection and applies changes; no launcher/daemon/operative. Teammate just runs /justify and it works. One-time per machine: justify installed + session started after.
  - Added Step 6 (Listen): after activate+verify, the session ENTERS the active justify_watch loop - watch -> apply_changes to source / acknowledge annotations -> loop. This is the active (not passive) listener Jonah wanted, and it is the same session, hands-free.
- Verified: install.sh bash -n OK; Step 6 + in-session framing present in both files; justify-go gone.

## Steady-state truth (how it works for a teammate)
1. Justify installed via the dotfiles (justify/install.sh registers the justify MCP + the /justify skill). 2. Teammate opens Claude in their project dir (fresh session -> has the justify MCP). 3. Types /justify. 4. Skill: inject core (justify-init) -> ensure site up -> open browser -> justify_activate -> verify connected tab + toolbar -> enter justify_watch listen loop. Justify is working. Cold-start cases (not installed / cert untrusted / improv conflict) are detected and fixed by the steps; only "not installed in this session yet" needs a one-time restart.

## Note for OUR current session
We still cannot run /justify here (this session predates the justify registration, so it has no justify_* tools). That is the one exception and not a flaw - any NEW session on this machine now has it. To dogfood /justify, start a fresh Claude session in the yesand dir.

## Files
- justify/install.sh (skill heredoc: in-session framing + Step 6 listen loop; justify-go wiring reverted)
- ~/.claude/skills/justify/SKILL.md (same, live)
- removed: justify/cli/justify-go.sh (+ installed copy + PATH symlink)
