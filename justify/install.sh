#!/bin/bash
set -euo pipefail

CLAUDE_DIR="${HOME}/.claude"
JUSTIFY_DIR="${CLAUDE_DIR}/justify"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Installing Justify..."

# Check for Node.js
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js is required. Install it first."
  exit 1
fi

if ! command -v npm &>/dev/null; then
  echo "ERROR: npm is required. Install it first."
  exit 1
fi

# Create directories
mkdir -p "$JUSTIFY_DIR"

# Copy all source files preserving structure
cp -r "$SCRIPT_DIR/server" "$JUSTIFY_DIR/"
cp -r "$SCRIPT_DIR/core" "$JUSTIFY_DIR/"
cp -r "$SCRIPT_DIR/adapters" "$JUSTIFY_DIR/"
cp "$SCRIPT_DIR/package.json" "$JUSTIFY_DIR/"
cp "$SCRIPT_DIR/tsconfig.json" "$JUSTIFY_DIR/"
cp "$SCRIPT_DIR/tsconfig.server.json" "$JUSTIFY_DIR/"
cp "$SCRIPT_DIR/tsconfig.core.json" "$JUSTIFY_DIR/"
cp "$SCRIPT_DIR/build.js" "$JUSTIFY_DIR/"

# Install dependencies (needs devDeps for typescript + esbuild build step)
echo "Installing dependencies..."
(cd "$JUSTIFY_DIR" && npm install 2>/dev/null) || {
  echo "WARNING: npm install failed. Run manually: cd $JUSTIFY_DIR && npm install"
}

# Build core script
echo "Building core script..."
(cd "$JUSTIFY_DIR" && node build.js 2>/dev/null) || {
  echo "WARNING: Build failed. Run manually: cd $JUSTIFY_DIR && node build.js"
}

# Build server
echo "Building server..."
(cd "$JUSTIFY_DIR" && npx -y tsc -p tsconfig.server.json 2>/dev/null) || {
  echo "WARNING: Server build failed. Run manually: cd $JUSTIFY_DIR && npx tsc -p tsconfig.server.json"
}

# Install CLI tools
echo "Installing CLI tools..."
cp "$SCRIPT_DIR/cli/init.sh" "$JUSTIFY_DIR/init.sh"
cp "$SCRIPT_DIR/cli/remove.sh" "$JUSTIFY_DIR/remove.sh"
chmod +x "$JUSTIFY_DIR/init.sh" "$JUSTIFY_DIR/remove.sh"

# Put commands in PATH - try /usr/local/bin first, then homebrew, then ~/.local/bin
BIN_DIR=""
for d in /usr/local/bin /opt/homebrew/bin "${HOME}/.local/bin"; do
  if [ -d "$d" ] && [ -w "$d" ]; then
    BIN_DIR="$d"
    break
  fi
done
if [ -z "$BIN_DIR" ]; then
  mkdir -p "${HOME}/.local/bin"
  BIN_DIR="${HOME}/.local/bin"
fi
ln -sf "$JUSTIFY_DIR/init.sh" "$BIN_DIR/justify-init"
ln -sf "$JUSTIFY_DIR/remove.sh" "$BIN_DIR/justify-remove"
echo "Installed justify-init and justify-remove to $BIN_DIR"

# Register MCP server in ~/.claude.json
python3 -c "
import json, os
p = os.path.expanduser('~/.claude.json')
if not os.path.exists(p):
    d = {}
else:
    d = json.load(open(p))
if 'mcpServers' not in d:
    d['mcpServers'] = {}
d['mcpServers']['justify'] = {
    'type': 'stdio',
    'command': 'node',
    'args': [os.path.expanduser('~/.claude/justify/dist/server/index.js')]
}
json.dump(d, open(p, 'w'), indent=2)
print('MCP server registered in ~/.claude.json')
"

# Install skill
SKILL_DIR="${CLAUDE_DIR}/skills/justify"
mkdir -p "$SKILL_DIR"

cat > "$SKILL_DIR/SKILL.md" << 'SKILLEOF'
---
name: justify
description: Visual micro-adjustment tool for in-browser design refinement
---

# Justify

Justify is a live in-browser design tool that lets you (or the user) visually tweak a running page and then hand those changes back to Claude as structured diffs. It injects a lightweight overlay into any open tab connected via WebSocket, exposing three interaction modes.

## Activation

Activate with `cmd+shift+i` in any connected browser tab, or call `justify_activate` from Claude.

## Modes

### Manipulate Mode

Click any element to select it. Hover over a CSS property in the panel to scrub its value with the mouse (left = decrease, right = increase). Changes are live-previewed in the browser and buffered server-side until you call `justify_apply_changes` to receive them as clean diffs.

### Prompt Mode

Press `p` to enter Prompt mode. Click an element to select it, then type an instruction inline ("make this button more rounded", "increase font size"). The prompt is sent to Claude along with the element's selector and computed styles, so Claude can propose targeted CSS changes.

### Annotate + Layout Mode

Press `a` to enter Annotate mode. Click elements to drop numbered markers with comments (intent: bug, suggestion, question, style). Press `l` to switch to Layout mode - drag elements onto a canvas grid to describe repositioning intent. Both annotation and layout data are buffered server-side and readable via `justify_get_annotations` and `justify_get_layout`.

## MCP Tools (11 total)

| Tool | Description |
|---|---|
| `justify_activate` | Broadcast activation signal to all connected browser tabs |
| `justify_status` | Return connection count, tab URLs, and buffer sizes |
| `justify_get_selection` | Get the currently selected element from the browser |
| `justify_get_pending_changes` | Return all style changes buffered from browser interactions |
| `justify_apply_changes` | Format buffered changes as human-readable diffs, clear buffer, notify browser |
| `justify_get_annotations` | Return design annotations (supports compact/standard/detailed/forensic verbosity) |
| `justify_watch` | Long-poll for new changes or annotations (configurable timeout) |
| `justify_acknowledge` | Mark a specific annotation as resolved by ID |
| `justify_get_layout` | Return layout placements from the browser canvas |
| `justify_get_components` | Return available components from the project component scanner |
| `justify_clear` | Clear all pending buffers and notify the browser |

## Typical Workflow

1. Open a dev server in a connected browser tab.
2. Call `justify_activate` (or press `cmd+shift+i`).
3. Use Manipulate mode to scrub values live.
4. Call `justify_get_pending_changes` to preview the buffer.
5. Call `justify_apply_changes` to receive formatted diffs.
6. Apply the diffs to source files.
SKILLEOF

echo "Justify installed successfully."
echo "  Core script: $JUSTIFY_DIR/dist/justify-core.js"
echo "  MCP server: $JUSTIFY_DIR/dist/server/index.js"
echo "  Skill: $SKILL_DIR/SKILL.md"
echo "  CLI: justify-init / justify-remove (symlinked to $CLAUDE_DIR)"
