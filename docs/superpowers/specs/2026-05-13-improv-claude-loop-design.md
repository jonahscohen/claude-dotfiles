# Improv-Claude Loop: Full Cycle Design

## Vision

A fully cyclical browser-to-Claude-to-browser experience where the user stays in the browser, selects elements, describes changes in natural language, and sees Claude's work reflected back in real time - without ever opening the terminal.

## Architecture

```
                      BROWSER                          SERVER                          CLAUDE
                  (improv-core.js)               (MCP + WebSocket)              (agent / goal)

  User selects elements          push_prompt          Buffer prompt
  User types instruction    ───────────────>    ─────────────────>
                                                                         improv_watch returns
                                                                         Read prompt + context
                                                                         Make code changes
                                                                         ───────────────>
                                                   push_result                improv_respond
                             <───────────────    <─────────────────
  Show change overlay
  Highlight modified els
  Display Claude's message
  User reviews / continues
```

## Components

### 1. Watch Agent (Claude-side)

A goal/agent prompt that Claude runs. It enters a loop:

```
1. Call improv_watch(timeout: 60)
2. If new data: call improv_get_prompts
3. For each prompt:
   a. Parse element context (selectors, computed styles, structure)
   b. Locate the relevant source files (CSS, HTML, component files)
   c. Make the requested changes
   d. Call improv_respond with:
      - summary of what changed
      - files modified
      - selectors affected
      - before/after values
4. Loop back to step 1
```

This runs as a persistent agent/goal. The user launches it once and it stays active.

### 2. improv_respond (New MCP Tool)

New server-side tool that Claude calls after making changes:

```typescript
mcp.tool('improv_respond', 'Send results back to the browser after processing a prompt', {
  promptId: z.string(),
  summary: z.string(),           // "Made the heading 24px and bold"
  filesChanged: z.array(z.string()),
  changes: z.array(z.object({
    selector: z.string(),        // ".hero h1"
    property: z.string(),        // "font-size"
    oldValue: z.string(),        // "16px"
    newValue: z.string(),        // "24px"
  })),
  status: z.enum(['completed', 'needsInfo', 'failed']),
  question: z.string().optional(), // If status is needsInfo
});
```

The server broadcasts this to the browser via WebSocket.

### 3. Auto-Refresh + Persistence

When a response arrives with `status: completed`, the browser automatically reloads the page so the user sees Claude's changes live. The change history persists through reloads via `localStorage` (key: `improv-change-history`), same pattern as markerColor.

**Flow:**
1. `improv_respond` broadcast arrives via WebSocket
2. Browser appends response to `localStorage` change history
3. If `status: completed` -> trigger `location.reload()`
4. If `status: needsInfo` -> no reload, just pulse the Claude button
5. If `status: failed` -> no reload, show error in changes panel
6. On page load, improv reads change history from `localStorage`
7. If unreviewed entries exist, Claude button appears with badge

**HMR compatibility:** Dev servers with hot module replacement (Vite, Next, Webpack) may reload before `improv_respond` arrives because Claude edited a source file. That's fine - the response lands in `localStorage` whenever it arrives, and the next load picks it up. The auto-refresh is a fallback for stacks without HMR (WordPress, static HTML).

### 4. Claude Button + Changes Panel (New)

After Claude completes a queue of tasks, a new button appears in the queuebar area - a circle with the Claude icon (Anthropic logo / sparkle). This is the user's entry point to review Claude's work.

**Claude button behavior:**
- Appears in the action pill next to the queue count, after the first response arrives
- Uses markerColor for active state (same WCAG contrast rules as other buttons)
- Badge shows count of unreviewed changes
- Tooltip: "Review Changes"

**Changes panel (opened by clicking the Claude button):**
- Fixed panel similar to the settings panel or queue panel
- Scrollable list of all changes Claude has made, persistent across the session
- Each change entry shows:
  - The original user prompt ("make this bigger")
  - Claude's summary ("Set heading font-size to 24px, font-weight to bold")
  - Files modified
  - Selectors affected with before/after values
  - Timestamp
- Each entry has action buttons:
  - **Done** - marks the change as reviewed/complete, dims it in the list
  - **Reply** - opens the prompt input pre-addressed to this change (for follow-ups like "actually make it 20px instead")
  - **Revert** (Phase 4) - undoes the change
- Completed items stay in the list (dimmed) so the user has a full history
- Panel scrolls to newest entries automatically

**Data flow:**
- `improv_respond` pushes results to browser via WebSocket
- Browser stores changes in a persistent array on ImprovCore
- Claude button badge updates on new entries
- Panel renders from the stored array

If Claude asks a question (status: needsInfo), the Claude button pulses to draw attention, and opening the panel shows the question with a reply input inline.

### 4. Prompt Queue + Priority

The existing queue system works as-is. When the user queues multiple prompts:
- Claude processes them in order
- Each response comes back individually
- The user sees progressive updates

### 5. Project Context

Claude needs to know WHICH project files to edit. The `.improv` marker file already stores the stack type. The watch agent should:
- Read `.improv` to understand the stack (WordPress, Next.js, Vite, etc.)
- Use the element selectors + stack knowledge to find the right files
- For WordPress: look in theme CSS/PHP files
- For React/Next: find the component file, use className/styled-components/Tailwind
- For generic HTML: find the stylesheet

## Implementation Phases

### Phase 1: Watch + Act (minimum viable loop)
- Write the watch agent goal prompt
- Claude picks up prompts, makes code changes, calls improv_respond
- Browser shows toast with Claude's summary
- User refreshes to see changes (no live reload yet)

### Phase 2: Claude Button + Changes Panel
- Claude icon button in action pill area
- Changes panel with scrollable persistent list
- Done/Reply actions per change entry
- Badge count for unreviewed changes
- needsInfo pulse + inline question

### Phase 3: Element Highlights + Live Feedback
- Flash modified elements with pulse animation
- Change pills showing before/after on affected elements
- Auto-reload or live CSS injection for instant feedback

### Phase 4: Live Preview
- Claude injects CSS changes via the existing PreviewEngine (constructable stylesheets)
- User sees changes BEFORE they're written to files
- "Apply" commits the preview to actual files
- "Revert" clears the preview

## What Exists Today

- Browser -> Server: push_prompt with full element context (done)
- Server buffering: pendingPrompts array (done)
- Claude -> Server: improv_get_prompts tool (done)
- Server -> Browser: WebSocket broadcast infrastructure (done)
- Polling: improv_watch with timeout (done)
- Preview engine: constructable stylesheet injection (done)
- Toast notifications: _showToast on ImprovCore (done)

## Design Principles

### Keyboard Navigation

Every interactive element in improv must be operable by keyboard. The browser is the user's workspace - they may be tabbing between elements, typing prompts, reviewing changes. Reaching for the mouse to dismiss a panel or mark a change complete breaks flow.

**All single-key shortcuts are suppressed when any text input, textarea, or contenteditable element is focused.** The check: `document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || document.activeElement.isContentEditable`. If true, let the keystroke through to the field. Only `Escape` and `Cmd+` combos fire regardless of focus.

**Toolbar:**
- `Cmd+Shift+.` toggles expand/collapse (exists)
- `Escape` exits current mode (exists, always fires)
- `P` activates/deactivates prompt mode
- `M` activates/deactivates manipulate mode
- `Tab` cycles through toolbar buttons when focused
- `Enter` / `Space` activates focused button

**Prompt input:**
- `Enter` queues the prompt (exists)
- `Cmd+Enter` sends immediately (exists)
- `Escape` dismisses the prompt input and deselects

**Changes panel:**
- `C` toggles the changes panel when toolbar is expanded
- `J` / `K` navigate between change entries
- `D` marks focused entry as done
- `R` opens reply for focused entry
- `Escape` closes the panel

**Queue panel:**
- `Q` toggles the queue panel
- `J` / `K` navigate entries
- `X` removes focused entry
- `E` edits focused entry

**Global:**
- All keyboard shortcuts suppressed when a text input is focused
- Focus trapping inside open panels (Tab cycles within, not out to page)
- Focus returns to trigger button when panel closes

### Accessibility

- All buttons: `role="button"`, `aria-label`, `tabindex="0"`
- Panels: `role="dialog"`, `aria-labelledby` pointing to panel title
- Change entries: `role="listitem"` inside `role="list"`
- Badge counts: `aria-live="polite"` so screen readers announce new changes
- Active mode: `aria-pressed="true"` on the active mode button
- Tooltips: `role="tooltip"`, connected via `aria-describedby`
- Color choices: never rely on color alone. Active states use background fill + icon change, not just color
- Focus visible: all interactive elements show a visible focus ring (2px solid, markerColor, offset 2px)
- Reduced motion: respect `prefers-reduced-motion` - skip animations, use instant transitions

### Visual Language

- Panels, tooltips, and overlays share the same dark glass aesthetic: `#1a1a1a` background, `rgba(255,255,255,0.1)` border, `0 2px 12px rgba(0,0,0,0.15)` shadow, `16px` border-radius
- All interactive elements: 32x32px minimum hit area (40x40 on touch), `border-radius: 50%` for icon buttons
- Transitions: 120ms for hover states, 200ms for panel open/close, 300ms for toolbar expand/collapse
- markerColor is the accent throughout. Never hardcode blue - always read from `this.markerColor`
- WCAG AA contrast on all text. Light backgrounds (orange, yellow, green) get `#1a1a1a` text; dark backgrounds get `#fff`
- Typography: `system-ui, -apple-system, sans-serif`. Labels 10px uppercase 600 weight. Content 12-13px. Counts 15px 700 weight tabular-nums
- Status indicators: green for connected/success, red for error/disconnect, markerColor for active, `rgba(255,255,255,0.65)` for resting
- No decorative elements. Every pixel earns its place

## What Needs Building

### Phase 1
1. `improv_respond` MCP tool on server
2. WebSocket handler for `response` messages in browser
3. Toast display for Claude responses in browser
4. Watch agent goal prompt (the `/goal` or agent instructions)
5. Prompt clearing after Claude processes them

### Phase 2
6. Claude icon button in action pill
7. Changes panel UI (scrollable list, done/reply actions)
8. Badge count for unreviewed changes
9. needsInfo pulse + inline question flow

### Phase 3
10. Element highlight flash for modified selectors
11. Change pill overlay UI
12. Live reload trigger (or dev server HMR signal)

### Phase 4
12. CSS preview via PreviewEngine before file write
13. Apply/revert workflow
14. Diff visualization in browser
