---
name: consolidate-nudge skips superseded_by beats (idempotent detector)
description: consolidate-nudge.sh now skips beats carrying superseded_by when counting clusters, so a consolidated cluster stops re-nudging. + 4 regression cases.
type: project
relates_to: [session_2026-06-05_consolidate-skill-and-cluster-detector.md]
---

Collaborator: Jonah. 2026-06-06. Task #4 on team consolidate-build (verifier's open finding).

## What + why
The detector counted a cluster by frontmatter type but did NOT skip already-consolidated beats. After /consolidate merged the tilt cluster (39 originals -> 1 canonical, originals stamped superseded_by), the detector would still count those merged beats and re-nudge "tilt has ~42" once the 1-day cooldown lapsed - even though a real /consolidate re-run finds only the few NEW candidates. The cooldown masked it day-to-day, but the count was wrong.

## How (fix)
- consolidate-nudge.sh: the per-beat scan already reads each beat's frontmatter head for `type`; folded the superseded check into that SAME single read. Renamed frontmatter_type() -> frontmatter_fields() returning (type, is_superseded). is_superseded is True only when `superseded_by:` carries a real value - null/~/none/empty/[]/{} placeholders count as LIVE. The loop now skips a beat if superseded, so the count reflects LIVE, not-yet-consolidated beats only. No extra file read; still cheap.

## Verified
- bash -n + py_compile clean.
- test-consolidate-nudge.sh (verifier's suite, I added 4 cases): 18/18 PASS. New: (1) 8 live + 6 superseded 'flux' < 12 -> SILENT; (2) same dir at threshold 8 reports LIVE count 8, not 14; (3) all-superseded cluster never fires even at threshold 1; (4) superseded_by: null treated as LIVE (still counted).
- REAL-CORPUS end-to-end proof: after the pilot superseded the tilt cluster (40 tilt files now carry superseded_by), the detector's live tilt count dropped to 3 (2 pruned drift files + the canonical) - under threshold, so tilt no longer fires. It now correctly headlines the next-biggest LIVE cluster `improv` (27), then sidecoach (24), hook (18). Idempotence confirmed in production: a consolidated cluster stops re-nudging and the next real cluster surfaces.

## Files
- claude/hooks/consolidate-nudge.sh (frontmatter_fields returns type+superseded; loop skips superseded)
- claude/hooks/test-consolidate-nudge.sh (4 new idempotence regression cases)
