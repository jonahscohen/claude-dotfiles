---
name: Changes panel list view fixes
description: Six fixes to improv changes-panel list view - button placement, clear button styling, zero-change tasks, filename display, artifact filtering, dedup diffs
type: project
relates_to: [session_2026-05-14_dishplayscapes-improv.md, session_2026-05-13_improv-punchlist.md, session_2026-05-12_improv-source-reconstruction.md]
---

Collaborator: Jonah

## Changes made to `improv/core/changes-panel.ts`

### 1. Moved action buttons inside summaryEl content div
- Buttons (Mark Done, Revert, Reply, Undo Done) now appended to `summaryEl` instead of `item`
- Removed `padding-left:16px` from both unreviewed and reviewed action divs
- Buttons now align flush with the summary text above them

### 2. Styled "Clear Completed Tasks" as a real button
- Was: `border:none;background:none;color:rgba(255,255,255,0.3);font-size:10px;padding:0`
- Now: `border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:rgba(255,255,255,0.45);font-size:11px;padding:6px 14px;border-radius:8px` with transitions
- Hover/mouseleave handlers now include borderColor changes alongside background and color

### 3. Zero-change tasks now visible in list view
- Filter no longer requires `(entry.changes || []).length > 0` for completed entries
- Added italic "No file changes were made." message for zero-change completed entries
- Guarded `entry.changes.map` with `(entry.changes || [])` in click handler
- Detail view does not open for zero-change entries (guarded `onItemClickCallback`)

### 4. Filename-only display in list view
- File entries show basename only (e.g. `style.scss` not `wp-content/themes/dish-wp/blocks/interior-hero/style.scss`)
- Full path shown in title attribute (tooltip on hover)

### 5. Compiled artifact filtering
- When a response includes both source and compiled files (e.g. `.scss` + `.css`), the compiled artifact is filtered out
- Matches: `.css`/`.min.css` filtered when `.scss`/`.sass`/`.less`/`.styl` exists in same response

### 6. Deduplicated diff display
- Identical property changes (same selector + property + old/new values) collapsed to single entry

## Build
- Built with `node build.js --core-only` - successful

## Files changed
- `improv/core/changes-panel.ts`
- `improv/dist/improv-core.js` (rebuilt)
