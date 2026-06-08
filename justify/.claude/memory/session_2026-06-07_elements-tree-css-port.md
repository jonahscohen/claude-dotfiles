---
name: Elements tree CSS port (T2)
description: Created elements-tree.css - verbatim 1:1 port of Retune's .retune-tree* CSS block
type: project
relates_to: [session_2026-06-07_elements-tab-port-plan.md]
---

Collaborator: Jonah (jonahscohen@gmail.com)

## What was done (BUILDER-CSS, task T2)

Created `core/manipulate/styles/elements-tree.css` - a faithful 1:1 port of
Retune's ElementTree CSS for the Manipulate-mode Elements tab.

**Source range ported:** `retune/packages/overlay/src/overlay/overlay.css`
lines 665-817 (the entire `.retune-tree*` block, from `.retune-tree` through
`.retune-tree-ghost`). Confirmed the exact range against the blueprint
(12-ELEMENTS-TAB.md section 7.1) - it matched.

**Classes ported (all verbatim class names matching ElementTree.tsx):**
`.retune-tree`, `.retune-tree-inner`, `.retune-tree-node` (+`:hover`,
`.selected`, `.descendant-selected`, `.dragging`, `.reparent-target`),
`.retune-tree-arrow` (+`.expanded`, `.empty`), `.retune-tree-icon`
(+`--component`), `.retune-tree-name` (+`--component`), `.retune-tree-moved`,
`.retune-tree-drop-indicator` (+`::before`), `.retune-tree-ghost`.

## Token mappings / literal decisions

**Zero remapping needed.** The Retune source block already references the
`--retune-*` token ramp throughout (not hardcoded hex), and every token it uses
is already defined in our `panel-shell.css`: `--retune-surface-hover`,
`--retune-blue-bg`, `--retune-blue-500`, `--retune-blue-text`, `--retune-text`,
`--retune-text-tertiary`, `--retune-surface`. So the port is byte-for-byte on
the rules. Dark theme + #1a1a1a panel chrome stay consistent automatically
because `:host(.dark)` remaps `--retune-surface:#1a1a1a` upstream.

**Literals kept verbatim (no token exists, read correctly on #1a1a1a):**
- `color-mix(in srgb, var(--retune-blue-500) 6%/15%, transparent)` for
  descendant-selected bg and reparent-target fill.
- `rgba(0,0,0,0.12)` ghost box-shadow.
- `:host(.dark)` override recoloring `--component` icon/name to `--retune-text`
  when the row is selected (kept 1:1).

**Font:** `.retune-tree-name` uses `font-size:11px; weight:400;
letter-spacing:0.005em` inheriting the panel base JustifySans. Did NOT force
JustifyMono - 1:1 with Retune per blueprint R7/section 7.3.

## Scope adherence
- Did NOT modify panel-shell.css or index.ts (wiring teammate registers the
  sheet in installPanelChrome). Self-contained file only.

## Build status
`node build.js` -> green (all 5 bundles built: core prod, react, vue, svelte).
Note: the CSS isn't imported yet (wiring teammate's job), so the text loader
exercise happens when index.ts adds the import; file is valid CSS regardless.

## Files touched
- CREATE `core/manipulate/styles/elements-tree.css`
