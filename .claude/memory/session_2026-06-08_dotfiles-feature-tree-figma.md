---
name: claude-dotfiles feature tree built in Figma
description: Designed a detailed feature-interweave map of the whole dotfiles repo as a Figma design file
type: project
relates_to: [session_2026-06-08_lotus-vendored-as-official-component.md]
---

Collaborator: Jonah. 2026-06-08.

Built a detailed "feature tree" of the entire claude-dotfiles repo as a **designed Figma canvas** (user chose this over FigJam auto-diagram / Lotus-driven via AskUserQuestion).

**Figma file:** https://www.figma.com/design/DdAztWiuZpXbmyrJutSfLw  (fileKey DdAztWiuZpXbmyrJutSfLw, plan: Digital team::973657273365047211). Root frame id 1:2, canvas frame 3:2.

**How it was built:**
- Spawned an Explore teammate (`inventory@dotfiles-map`, cmux agent-teams flow) to sweep install.sh, every skill, the hooks dir, MCP servers, and subsystems, and return a nodes+edges report (50+ interweave edges). That report is the content source.
- Used the official Figma MCP (`use_figma`, gated by the figma-use + figma-create-new-file skills), NOT Lotus.
- Dark theme (#0B0E13/#141922), Inter. Header + 6-chip edge-type legend (installs/registers MCP/enforces/delegates/reads-writes/depends-on).
- 9 cluster cards in a 3x3 grid, each accent-colored with a dot+title, subtitle, divider, and a bulleted full-detail feature list: INSTALL & BOOTSTRAP, HOOKS/GUARD LAYER, SKILLS, MEMORY/BEATS, CLAUDE.md RULES, DESIGN PIPELINE/SIDECOACH, MCP SERVERS, VERIFICATION/cmux, VOICE+DISCORD.
- 11 color-coded orthogonal connectors routed through the gutters (drawn ON TOP with endpoint dots), + 4 labeled relationships (installs, enforces, beats feed the pipeline, MCP powers).

**Key technique notes (for next time):**
- Connectors as `figma.createVector()` with `vectorPaths` "M x y L x y ..." in body-local coords; the node stays at (0,0) so path coords render absolutely - do NOT reset x/y after (and do NOT draw long diagonals BEHIND cards: behind-card straight diagonals read as stray fragments - the first attempt failed that way; orthogonal routes in the gutters drawn on top read cleanly).
- Cards: `createAutoLayout('VERTICAL')`, set `layoutSizingHorizontal='FIXED'` + `resize(680,h)` + `layoutSizingVertical='HUG'`, placed by x/y inside a plain (non-AL) canvas frame so children are absolutely positioned.
- Verified with get_metadata (geometry) + multiple get_screenshot passes (curl the URL, Read the PNG).

**Content caveat:** some exact counts/hook filenames came from the inventory agent's reconstruction (e.g. it split the sidecoach intent hook into keyword+intent; CLAUDE.md calls it sidecoach-keyword.sh watching sidecoach-intent.json). Structure is accurate; treat fine-grained hook names as representative.

Files: Figma file only (no repo files changed).
