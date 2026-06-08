---
name: SELF-ANALYSIS - diagnosed Justify as a black box instead of reading the code + beats (Jonah correction)
description: Jonah corrected me hard - "you're not reading notes, you're not looking at code, you're not understanding the build." On the "changes should show bottom-left" question I went straight to browser screenshots/clicks instead of reading justify/core source + the existing panel beats, which answer it definitively. Naming the failure mode so it gets caught earlier next time.
type: feedback
relates_to: [feedback_debugging_trace_first.md]
---

Collaborator: Jonah. 2026-06-05.

## The failure (named specifically)
Jonah asked why his changes were not showing in Justify's bottom-left corner. I diagnosed it as a BLACK BOX - chrome screenshots, zooming a badge, clicking the launcher - instead of reading the SOURCE OF TRUTH:
- justify/core/changes-panel.ts: line 44 hard-codes `position:fixed;bottom:68px;left:20px` - the changes panel IS bottom-left by design. One grep would have confirmed Jonah was right in seconds.
- justify/core/index.ts: the panel is fed by `transport.on('changes_applied')` + `_changeHistory`, toggled via `changesPanel.toggle(_changeHistory)`. So it only populates after Claude applies changes back.
- A whole shelf of beats documents this exact thing and I opened none: session_2026-05-13_changes-panel-polish.md, session_2026-05-04_improv-panel-reference-rewrite.md, decision_improv_claudebar_architecture.md, decision_improv_http_polling_watch.md, session_2026-05-16_response-batching.md, session_2026-05-16_improv-working-ack.md.

## Why it happened
- I optimized for fast VISIBLE feedback (it was a UI question, so I looked at the UI) instead of treating "how is this supposed to work" as a question the CODE and BEATS answer authoritatively.
- The MEMORY.md index listing these panel beats was in my context the entire time; I treated beats as background ambiance, not as the spec to read before acting.
- This was a PATTERN across the whole Justify thread this session: probe/guess/screenshot first, read source last (or never). Jonah felt it accumulate, then called it.

## How to prevent (the rule)
When a question is about how the BUILD behaves (where a thing renders, what should happen, why a feature is/ isn't working), READ THE CODE + RELEVANT BEATS FIRST, before any external probing. grep the source; open the named beats from the MEMORY index. The running app is for VERIFYING an understanding, not for FORMING one from scratch. External probing is step 2, never step 1, for "how does the build work" questions.

## The grounded answer this produced (so it is not lost)
Justify's bottom-left "Changes" panel is real and correct (changes-panel.ts, bottom:68px left:20px, "Changes from Claude", display:none until populated). It fills from the `changes_applied` transport event - i.e. AFTER the operative Claude calls justify_apply_changes on a tweak/prompt and pushes the applied diffs back. It is empty because nothing completed the round-trip: the operative session connected + activated Justify, then STALLED ("Whirlpooling" 8m+), never entered the justify_watch listen loop (Step 6), so nothing was received/applied/returned. justify_status pending.changes:0 confirms nothing flowed. Not a panel bug - the pipeline is stalled at the operative, which never started listening.

## Files
- (analysis only; no code changed)
