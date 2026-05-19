---
name: session-2026-05-18-validation-trigger-guard
description: Extended the validation guard to block JS-triggered interactions (not just JS reads), and mirrored the rule into bash-guard so cmux eval can't bypass it. Real user interactions are now the only sanctioned path for UI validation.
type: project
relates_to: [session_2026-05-13_validation-guard-hook.md, session_2026-05-18_queued-tasks-live-add.md]
---

## 2026-05-18 Validation trigger guard

### Why this exists

The 2026-05-13 validation-guard.sh blocked READ shortcuts (getComputedStyle, scrollTop, textContent, etc.) on the chrome MCP javascript_tool. That ensured Claude couldn't "validate" the UI by probing computed state instead of taking screenshots.

It didn't block TRIGGER shortcuts. On 2026-05-18 the user gave a hard correction after I "validated" the queued-tasks rise-in by calling internal methods directly via cmux eval:
- `window.__improv.activate()`
- `window.__improv.switchMode('prompt')`
- `pm._toggleQueuePanel()`
- `pm._changeQueue.push({...})`
- `pm._appendQueueRowAnimated(...)`

The user's bug was reproducible only via real interactions (typing in the inline prompt + pressing Enter). My JS triggers bypassed the exact event path the bug lived in. So "validated" meant nothing.

### The new rule

Validation via UI must use real user inputs only:
- cmux: `click --selector ...`, `type --selector ... --text ...`, `press --key ...`, `screenshot`, `snapshot --interactive`
- chrome MCP: `computer left_click` (coords), `computer type`, `computer key`, `computer screenshot`, `read_page`

The following are now BLOCKED at the hook level:
- Synthetic `.click()` invocations (skips real event flow)
- `.dispatchEvent(...)` (synthesizes events instead of triggering via input)
- Private method invocations (`._foo(`)
- Method calls on the `__improv` application namespace
- Mutations of private application arrays (`._foo.push/splice/...`)
- Developer-state probes via cmux eval (getComputedStyle, getBoundingClientRect, scrollTop/scrollHeight/offsetHeight, textContent, innerHTML)

The block fires both at the chrome MCP javascript_tool boundary (validation-guard.sh) AND at the Bash boundary when the command contains `cmux ... eval` (bash-guard.sh).

### Allowed escape hatches (setup, not validation)

The guard does NOT block:
- Bundle injection: `document.createElement('script')`, `appendChild`, `s.textContent = ...`
- Cleanup: `delete window.__improv`
- Console logging: `console.log(...)`
- cmux click/type/press/screenshot/snapshot subcommands
- Reading the page through `read_page` or `get_page_text`

If validation requires bundling a fresh script in (mixed-content page can't load HTTP localhost), that path stays open. Triggering the actual feature still requires real input.

### Implementation

Two files in `claude/hooks/`:

**`validation-guard.sh`** (PreToolUse for `mcp__claude-in-chrome__javascript_tool`):
Existing read-shortcut checks retained. Added trigger-blocking section:
- `\.click\(\s*\)` -> synthetic click
- `\.dispatchEvent\(` -> synthesized event
- `\._[a-zA-Z][\w]*\s*\(` -> private method call
- `(window\.)?__improv\.\w+\s*\(` -> application-namespace method
- `\._[\w]+\.(push|splice|shift|unshift|pop)\s*\(` -> private array mutation

**`bash-guard.sh`** (PreToolUse for Bash):
Added a gate that fires only when the command contains `cmux ... eval`. Mirrors the same patterns plus the developer-API probes (getComputedStyle, scrollTop, textContent, etc.) so cmux can't be used to bypass.

`validation-guard.sh` is now symlinked from dotfiles (was a standalone file before).

### Verification

Built `/tmp/test-validation-guard.sh` that pipes contrived inputs into both hooks and asserts deny/allow per case. All 20 cases pass:

- bash-guard: 7 deny cases (cmux eval __improv.method, private method, _array.push, .click(), dispatchEvent, getComputedStyle, scrollTop) + 6 allow cases (bundle injection setup, cmux click/type/screenshot, plain curl, ls)
- validation-guard: 6 deny cases (JS __improv.method, private method, _array.push, .click(), dispatchEvent, getComputedStyle) + 1 allow case (console.log)

### What this means going forward

When verifying any UI behavior I cannot:
1. Open a browser
2. Call internal methods to set up state
3. Take a screenshot
4. Claim it works

I MUST:
1. Open the browser at the same URL the user is on
2. Click/type/press through the real user flow to reach the state I'm checking
3. Screenshot the result
4. Compare against expected

If the cmux/chrome MCP click commands can't reach something (shadow DOM, off-screen, etc.), say so and ask the user, don't reach in via JS.

### Files changed
- `claude/hooks/validation-guard.sh` (now in dotfiles; symlinked from ~/.claude/hooks/)
- `claude/hooks/bash-guard.sh` (extended with cmux-eval gate)
- `/tmp/test-validation-guard.sh` (test harness; not in repo)

Collaborator: Jonah Cohen
