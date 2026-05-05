# Improv - Visual Micro-Adjustment Tool for Claude Code

**Date:** 2026-05-04
**Author:** Jonah
**Status:** Design approved, pending implementation plan

## Overview

Improv is a dotfiles component that enables in-browser visual micro-adjustments - drag handles, sliders, color pickers, annotations, and layout composition - and sends structured diffs back to Claude Code to update source code. It combines the best of three existing tools: the reference tool's visual manipulation, React Grab's context extraction for prompting, and reference annotation tool's annotation and layout composition.

Improv is framework-agnostic by design. A core browser script works on any stack (React, Vue, Svelte, Rails, PHP, static HTML, anything with a browser). Optional framework adapters enrich the experience with component names, props, and source locations. An MCP server bridges the browser and Claude Code.

All code changes flow through Claude - Improv never writes source files directly. This ensures changes respect the project's conventions, DESIGN.md tokens, and styling approach.

## Architecture

```
Browser                          Local
-------                          -----
[Core script]  <-- WebSocket --> [MCP server] <-- stdio --> [Claude Code]
[Adapters]                       [Source resolver]
                                 [Diff formatter]
                                 [Component scanner]
```

Three layers:
- **Core browser script** - framework-agnostic overlay, event interception, element identification, live preview engine, three interaction modes
- **Framework adapters** - optional packages (React, Vue, Svelte) that enrich element context with component-level data
- **MCP server** - local Node.js process handling source mapping, diff generation, component discovery, and Claude communication

## Package Structure

```
claude-dotfiles/
  improv/
    core/
      src/
        overlay/             # Shadow DOM overlay, floating toolbar, mode UI
        selection/           # Element identification, selector generation
        manipulate/          # Drag handles, sliders, color pickers
        annotate/            # Multi-select, lasso, annotation markers
        layout/              # Component palette, drag-and-drop, snapping
        preview/             # Constructable Stylesheet engine (live CSS)
        transport/           # WebSocket client to MCP server
      dist/                  # Built output: improv-core.js

    adapters/
      react/                 # Fiber traversal, component names, props, _debugSource
      vue/                   # Vue devtools protocol, component tree
      svelte/                # Svelte debug info

    server/
      src/
        mcp/                 # MCP tool definitions (stdio transport)
        ws/                  # WebSocket server (browser communication)
        source/              # Source map resolution, CSSOM fallback, grep
        diff/                # Structured diff generation and formatting
        scanner/             # Project component/token discovery

    install.sh               # Ampersand component installer
```

## Core Browser Script

### Overlay Isolation

Shadow DOM for complete style isolation. A fixed-position host div with `z-index: 2147483647`, `attachShadow({ mode: "open" })`, styles via Constructable Stylesheets (`adoptedStyleSheets`). The overlay never leaks into or inherits from the host page. Proven by both reference tool and React Grab.

### Event Interception

React Grab's O(1) approach: inject `html { pointer-events: none !important }` when a mode is active. To identify the element under cursor, temporarily disable the style, call `document.elementFromPoint()`, re-enable on 100ms debounce. The page is frozen while Improv is active (no accidental clicks, no hover state interference). Improv's Shadow DOM overlay stays interactive. Removing the style fully restores page interactivity.

### Element Identification (Framework-Agnostic)

- `@medv/finder` for CSS selector generation with a dynamic class filter that strips CSS Module hashes, styled-components hashes, and Tailwind JIT classes
- Fallback to `tag:nth-of-type(n)` chains up to `document.body`
- Computed styles via `getComputedStyle()` for current values
- Framework adapters enrich selections with component names, props, and source file info when available

### Adapter Registration API

```js
improv.registerAdapter({
  name: 'react',
  enrichElement(domNode) { ... },   // returns component name, props, source
  getComponentTree(domNode) { ... }, // returns ancestry chain
  freeze() { ... },                  // framework-specific render freeze
  unfreeze() { ... }
})
```

Multiple adapters can register simultaneously. Core calls each one and merges results.

### Floating Toolbar

Three mode icons (Manipulate, Prompt, Annotate+Layout) plus a status indicator (connected/disconnected to MCP). Compact, draggable to any screen edge. Hidden until activated via `cmd+shift+i` or Claude's MCP call. A change count badge shows pending unapplied changes.

## Mode 1: Manipulate

Visual micro-adjustment controls. Click an element to select it, a property panel appears.

### Dynamic Controls

| Element context | Controls shown |
|---|---|
| Any element | padding, margin, border-radius, background, opacity, box-shadow, z-index |
| Text elements | font-size, weight, line-height, letter-spacing, color, alignment |
| Flex container | direction, gap, align-items, justify-content, wrap |
| Grid container | columns, rows, gap |
| Images | object-fit, object-position, aspect-ratio |
| Positioned elements | offsets, z-index |

Controls are determined by computed styles and element type.

### Interaction Patterns

- Scrub-to-adjust on numeric values (drag left/right). Shift = 10x step, Alt = 0.1x step.
- Color values get a color picker
- Border-radius gets corner handles directly on the element
- Padding/margin get edge handles on the element (drag to resize)
- State toggles (hover, focus, active, visited) to inspect and adjust pseudo-state styles

### Live Preview Engine

Constructable Stylesheets (the reference tool's proven approach):
- Single `CSSStyleSheet` added to `document.adoptedStyleSheets`
- Each adjustment inserts a rule with `!important` targeting the element's generated selector
- Changes visible instantly in the browser
- Reverting a single change: delete the rule, rebuild the sheet
- Reverting everything: remove the sheet from `adoptedStyleSheets` - atomic, instant
- Non-destructive: never touches the page's existing stylesheets or inline styles

### Batch and Apply

All adjustments accumulate in a change buffer. Nothing touches source code until the user hits "Apply":

1. Change buffer sent to MCP server over WebSocket
2. MCP server resolves each change to source files (source maps primary, grep fallback)
3. MCP server formats structured diffs and passes them to Claude via stdio
4. Claude writes the code changes
5. MCP server sends confirmation back over WebSocket
6. Overlay shows green checkmarks per change with file paths

## Mode 2: Prompt

Context extraction + natural language prompting. The React Grab equivalent, enriched by Improv's awareness.

### Workflow

Click an element. Improv extracts full context. An inline text input appears (inside Shadow DOM) where you describe the change in natural language. Context + prompt go to Claude together via MCP.

### Context Extraction Format

```
Element: <button> "Get Started"
Selector: main > section.hero > div > button.btn-primary
Classes: btn btn-primary hero-cta
Computed: padding: 12px 24px; border-radius: 8px; background: #2563eb; font-size: 14px

[If adapter loaded]
Component: <App> <HeroSection> <Button>
Source: src/components/HeroSection.tsx:42
Props: { variant: "primary", size: "lg" }

[If DESIGN.md exists]
Tokens: background maps to {colors.primary.600}; border-radius maps to {rounded.lg}

Nearby elements: 3 sibling buttons with same classes
Page URL: http://localhost:3000/
Viewport: 1440x900
```

### Multi-Element Prompt

Shift+click to select multiple elements, then prompt. Context includes all selected elements and their relationships. Useful for "make these the same height" or "even out the spacing."

### Clipboard Fallback

`Cmd+C` copies context in three formats simultaneously:
- `text/plain` - the structured text
- `text/html` - escaped in `<pre><code>`
- `application/x-improv` - JSON metadata with version, entries, timestamp

No live preview in Prompt mode. Claude interprets the prompt, writes code, dev server hot-reloads.

## Mode 3: Annotate + Layout

Two sub-modes within this tab.

### Annotate

**Selection types:**
- Single click: select one element, add a comment
- Shift+click: multi-select, shared annotation
- Click+drag: lasso rectangle, everything intersecting gets selected
- Text highlight: select text on the page for copy annotations

**Annotation data:** element selector, element path (4 levels up), computed styles, bounding box, nearby text, accessibility info, comment, intent tag (fix/change/question/approve), severity (blocking/important/suggestion).

**Output verbosity** (four levels):
- **Compact:** one-liner per annotation
- **Standard:** element name, selector, source, component tree, comment
- **Detailed:** adds classes, position, bounding box, context
- **Forensic:** adds full computed styles, accessibility tree, full DOM path, environment

### Layout

**Component palette** (sidebar panel inside Shadow DOM):
- **Project components:** discovered from DESIGN.md, component directories, index exports
- **Generic primitives:** always available. ~66 types across 5 categories:
  - Layout (11): navigation, header, hero, section, sidebar, footer, modal, banner, drawer, popover, divider
  - Content (17): card, text, image, video, table, grid, list, chart, codeBlock, map, timeline, calendar, accordion, carousel, logo, faq, gallery
  - Controls (14): button, input, search, form, tabs, dropdown, toggle, stepper, rating, fileUpload, checkbox, radio, slider, datePicker
  - Elements (15): avatar, badge, tag, breadcrumb, pagination, progress, alert, toast, notification, tooltip, stat, skeleton, chip, icon, spinner
  - Blocks (9): pricing, testimonial, cta, productCard, profile, feature, team, login, contact

**Drag and drop:** Components render as skeleton placeholders positioned absolutely on a full-page overlay. Not real DOM nodes. Each placement records type, position, dimensions, scroll offset.

**Snapping:** Edge snapping against other placements and existing DOM elements. 5px threshold. Guide lines render at snap points.

**Rearrange:** Detects top-level page sections (children of `<main>` or `<body>`). Sections can be dragged to reorder.

**Apply:** Layout sent to Claude as a structured description. Claude translates skeleton placements into the project's actual component system and writes the code.

### Animation Freeze

Available in all Annotate+Layout interactions. Three-layer approach:

1. **JS:** monkey-patch `setTimeout`, `setInterval`, `requestAnimationFrame` - queue callbacks, replay on unfreeze
2. **CSS:** inject `animation-play-state: paused !important; transition: none !important` on all elements except Improv's own UI
3. **WAAPI + video:** pause running animations via `document.getAnimations()`, pause videos with state tracking

## MCP Server

Local Node.js process. Two transport layers.

### Communication

- **WebSocket** (port 9223, auto-increment to 9232 if occupied) - browser communication. JSON-RPC protocol with handshake within 5 seconds.
- **stdio** - MCP protocol to Claude Code via `@modelcontextprotocol/sdk`.

### Tools

| Tool | Purpose |
|---|---|
| `improv_activate` | Injects core script into the current page |
| `improv_status` | Connection health, active mode, pending change count |
| `improv_get_selection` | Currently selected element(s) with full context |
| `improv_get_pending_changes` | Raw before/after diffs from Manipulate mode |
| `improv_apply_changes` | Resolves diffs to source files, returns structured output for Claude to write |
| `improv_get_annotations` | All annotations with verbosity control |
| `improv_watch` | Long-polls for new changes or annotations (SSE-backed) |
| `improv_acknowledge` | Marks annotations as resolved |
| `improv_get_layout` | Current layout mode placements as structured description |
| `improv_get_components` | Discovered project components and available primitives |
| `improv_clear` | Clears all pending changes and annotations |

### Source Resolver

Four-tier resolution strategy:

1. **Source maps (primary):** Server reads project source map files from disk. Browser reports which stylesheet rule owns a property; server resolves through the source map to original file and line.

2. **CSSOM assist:** Browser walks `document.styleSheets` and sends rule-level data (selector, property, value, stylesheet href, specificity). Server correlates with on-disk files.

3. **Tailwind special case:** No traditional source maps. Server scans element's class list against a utility registry, identifies which class produces which property, emits prescriptive class swap diffs. Detects Tailwind via class name patterns.

4. **Grep fallback:** Searches project files for matching selectors and declarations. Handles legacy stacks, plain CSS, PHP-rendered pages.

### Styling Approach Detection

Server detects the project's styling approach (Tailwind, CSS Modules, styled-components, Sass, plain CSS) and includes guidance in diffs so Claude writes changes in the project's idiom.

### Diff Format (what Claude receives)

```
File: src/components/Hero.module.css
Line: 23
Rule: .hero-button
Changes:
  padding: 12px 24px -> 16px 32px
  border-radius: 8px -> 12px

File: src/components/Hero.tsx
Line: 42
Context: Tailwind classes on <button>
Changes:
  remove class: py-3 px-6 rounded-lg
  add class: py-4 px-8 rounded-xl

---
Styling approach: Tailwind CSS detected
Guidance: Apply all changes using utility classes. Do not use inline styles.
Design tokens: border-radius maps to {rounded.xl} per DESIGN.md
```

### Component Scanner

On startup and on file change (via `fs.watch`), scans the project for:
- DESIGN.md tokens and components
- Exported components from index files
- Component directories matching common patterns (`components/`, `ui/`, `lib/`)

Results populate the Layout mode's project component palette.

## Installation and Activation

### Ampersand Install

`ampersand --only improv`:

1. Checks for Node.js
2. Builds `improv-core.js` and adapter scripts
3. Copies built artifacts to `~/.claude/improv/dist/`
4. Registers MCP server in `~/.claude/settings.json`
5. Installs the `/improv` skill
6. Symlinks `~/.claude/improv-inject` helper

### Per-Project Activation

**Path 1 - Claude-initiated (zero project changes):**
Say "activate improv" or hit `cmd+shift+i`. Claude calls `improv_activate` MCP tool. MCP server injects core script into the current page. Nothing added to the project.

**Path 2 - Script tag (any stack):**
```html
<script src="http://localhost:9223/improv-core.js"></script>
```
MCP server serves the built script on its WebSocket port. Works with any stack.

**Path 3 - Framework import (JS projects):**
```js
if (process.env.NODE_ENV === 'development') {
  import('~/.claude/improv/dist/improv-react.js')
}
```
Adapter auto-includes core. Richest context.

### Keyboard Activation

`cmd+shift+i` toggles the overlay. If the core script is already loaded in the page, it handles the shortcut directly. If not, the shortcut only works after Claude-initiated activation (Path 1) has injected the script at least once. There is no persistent background listener - the keyboard shortcut is a convenience toggle once the script is present, not a cold-start mechanism.

### Session Lifecycle

1. Core script connects to MCP server via WebSocket on load
2. MCP server registers the connection (tracks multiple tabs/pages)
3. Claude queries any connected page through MCP tools
4. Browser tab close disconnects WebSocket, server cleans up
5. MCP server runs for the duration of the Claude Code session

## Scope Boundaries

**Improv does NOT:**

- Write source files directly. All changes go through Claude.
- Run in production. Dev-only, gated behind environment checks.
- Replace Figma or design tools. It tweaks what's rendered, not designs from scratch.
- Track visual diffs or version history. Git is the history.
- Have remote/cloud components. Everything is localhost. No accounts, no telemetry.
- Build custom components. Layout mode places existing components and primitives.

## Prior Art and Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Overlay isolation | Shadow DOM | Proven by reference tool and React Grab. Complete style isolation. |
| Event interception | `html { pointer-events: none }` | React Grab's O(1) approach. Better than O(N) universal selector. |
| Live preview | Constructable Stylesheets | the reference tool's approach. Non-destructive, atomic revert. |
| Selector generation | `@medv/finder` + hash filter | the reference tool's approach. Handles dynamic class names. |
| Layout placeholders | Skeleton overlays | reference annotation tool's approach. No real DOM mutation. |
| Animation freeze | JS patch + CSS inject + WAAPI | reference annotation tool's three-layer approach. Comprehensive. |
| Browser-to-server | WebSocket JSON-RPC | the reference tool's approach. Bidirectional, low latency. |
| Server-to-Claude | MCP stdio | Industry standard. All three tools converged here. |
| Source mapping | Source maps > CSSOM > Tailwind registry > grep | Four-tier fallback ensures every stack is covered. |
| Framework support | Core + optional adapters | Universal base, enriched by framework-specific packages. |

## Dependencies (anticipated)

**Core script:**
- `@medv/finder` - CSS selector generation
- `parsel-js` - selector parsing

**MCP server:**
- `@modelcontextprotocol/sdk` - MCP protocol
- `ws` - WebSocket server
- `source-map` - source map resolution
- `zod` - schema validation
- `chokidar` - file watching for component scanner
