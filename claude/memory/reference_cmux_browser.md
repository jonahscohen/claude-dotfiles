---
name: cmux browser pane
description: How to open and use the cmux built-in browser for UI verification instead of Chrome MCP
type: reference
---

When operating inside a cmux terminal pane, use the cmux built-in browser for UI verification. This should be the first choice over Chrome MCP or any external browser. Fall back to Chrome MCP only if cmux browser hits rendering limitations.

## Key commands

- `cmux browser open <url>` - Opens a browser split in the current workspace
- `cmux browser navigate <url>` - Navigate existing browser to a URL
- `cmux browser snapshot` - Get a DOM snapshot of the current page
- `cmux browser screenshot` - Take a screenshot
- `cmux browser click <selector>` - Click an element
- `cmux browser eval <script>` - Run JS in the browser

## Known limitations

- Cannot render SVG `<pattern>` elements or 3D CSS transforms on SVG children
- If something looks wrong in cmux browser, verify in Chrome before assuming the code is broken

## Workflow

1. Start dev server (`npm run dev` in background)
2. Wait for server to be ready (curl health check)
3. `cmux browser open "http://localhost:<port>/<path>"`
4. Use snapshot/screenshot commands to verify UI
