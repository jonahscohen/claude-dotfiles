# Lotus

AI-powered Figma plugin for generating, modifying, and reviewing UI designs directly on the canvas. Supports multiple AI providers (Anthropic, OpenAI, Google) with 7 specialized modes, 35+ design tools, and an MCP server for external editor integration.

## Features

- **7 Design Modes**: Generate, Modify, Style Transfer, Components, Code Export, Accessibility Audit, and Design Critique
- **Multi-Provider AI**: Bring your own API key for Claude, GPT, or Gemini with per-provider model selection
- **35+ Figma Tools**: Create frames, text, shapes, SVG vectors; modify properties, fills, strokes, effects; manage components, variables, and constraints
- **AI SVG Generation**: Generate and trace vector graphics using AI — no external API needed
- **Design Knowledge System**: 12 built-in knowledge modules (typography, color, layout, motion, responsive, data visualization, interaction states, and more) injected contextually per mode
- **Design Critique Mode**: Structured 7-dimension scored review with actionable priorities
- **Accessibility Auditing**: WCAG AA/AAA contrast checks, touch targets, text readability
- **MCP Server**: Bridge Cursor, Claude Code, or Windsurf to control Figma via Model Context Protocol
- **Encrypted Key Storage**: AES-256-GCM encryption with user-derived PBKDF2 keys
- **Conversation History**: Save, restore, and manage past design conversations

## Quick Start

```bash
# Clone and install
git clone https://github.com/your-org/lotus.git
cd lotus
npm install

# Build for Figma
npm run build

# Load in Figma
# 1. Open Figma Desktop
# 2. Plugins → Development → Import plugin from manifest...
# 3. Select manifest.json from this repo
```

## Configuration

1. Open the plugin in Figma
2. Click the gear icon to open Settings
3. Enter your API key for one or more providers:
   - **Anthropic**: `sk-ant-...` (Claude Opus 4.8, Sonnet 4.6, Haiku 4.6)
   - **OpenAI**: `sk-...` (GPT-5.5, GPT-5.2, GPT-5)
   - **Google**: `AIza...` (Gemini 3.1 Pro, Gemini 3 Flash, Gemini 2.5 Pro/Flash)
4. Select your preferred model and set the provider as active

API keys are encrypted with AES-256-GCM using PBKDF2-derived keys tied to your Figma user ID, and stored in Figma's local client storage.

## Modes

| Mode | Description |
|------|-------------|
| **Design** | Describe a UI and it's created as editable Figma layers on your canvas |
| **Modify** | Select elements and describe changes — properties are updated in-place |
| **Style Transfer** | Copy visual styles from a source element to target elements |
| **Components** | Generate full component sets with Cartesian variants |
| **Code Export** | Export frames as React, Vue, Svelte, or HTML/Tailwind code |
| **Conformance** | WCAG accessibility audit with contrast checks and fix suggestions |
| **Critique** | Structured design review scoring 7 dimensions with actionable priorities |

## Tool Reference

### Create & Layout
| Tool | Description |
|------|-------------|
| `create_frame` | Create auto-layout frames |
| `create_text` | Create text nodes |
| `create_rectangle` | Create rectangles/shapes |
| `create_ellipse` | Create circles/ovals |
| `create_line` | Create lines/dividers |
| `create_svg_node` | Create vectors from SVG markup |
| `create_design` | Create entire UI trees in one call |
| `move_to_parent` | Restructure layer hierarchy |

### Modify & Style
| Tool | Description |
|------|-------------|
| `modify_node` | Update any node property |
| `set_fill` | Apply solid/gradient fills |
| `set_stroke` | Set border properties |
| `set_effects` | Set shadows and blurs |
| `style_text_range` | Mixed typography within text |
| `set_constraints` | Responsive constraints |
| `delete_node` | Remove nodes |

### Read & Inspect
| Tool | Description |
|------|-------------|
| `get_selection_context` | Inspect current selection |
| `get_design_system` | Get file styles/variables/components |
| `scan_design_system` | Filtered design system scan |
| `read_node_properties` | Deep-inspect a node by ID |
| `get_page_structure` | Full layer tree |
| `find_nodes` | Search by name/type |
| `list_available_fonts` | Browse available fonts |
| `screenshot_node` | Visual QA screenshots |

### Creative
| Tool | Description |
|------|-------------|
| `generate_svg` | AI-generated vector graphics |
| `image_to_svg` | Raster-to-vector tracing |

### Components & Variables
| Tool | Description |
|------|-------------|
| `generate_component_set` | Cartesian variant generation |
| `create_component_instance` | Instantiate components |
| `get_variables` | List variable collections |
| `create_variable` | Create design tokens |
| `bind_variable` | Bind tokens to properties |

### Export & Analysis
| Tool | Description |
|------|-------------|
| `export_code` | React/Vue/Svelte/HTML export |
| `export_as_svg` | SVG markup export |
| `analyze_accessibility` | WCAG audit |
| `apply_style_transfer` | Cross-node style copy |

## MCP Integration

Lotus includes an MCP (Model Context Protocol) server that lets external AI tools like Cursor, Claude Code, or Windsurf control Figma.

### Setup

```bash
# Install and build the MCP server
cd mcp-server
npm install
npm run build

# Start (default port 9527)
npx lotus-mcp

# Or with custom port
LOTUS_PORT=8888 npx lotus-mcp
```

### Connect from Figma
1. Open Lotus in Figma
2. Go to Settings → MCP Bridge
3. Set the port (default 9527) and click Connect

### Configure in Claude Code
Add to your Claude Code MCP config:
```json
{
  "mcpServers": {
    "lotus": {
      "command": "npx",
      "args": ["lotus-mcp"]
    }
  }
}
```

### Configure in Cursor
Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "lotus": {
      "command": "npx",
      "args": ["lotus-mcp"]
    }
  }
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Figma Plugin                                           │
│  ┌───────────────────┐   ┌──────────────────────────┐   │
│  │  Plugin Sandbox    │   │  UI Iframe (React)       │   │
│  │  (code.js)         │◄──┤  ├─ Chat + Prompt Input  │   │
│  │  ├─ Controller     │──►│  ├─ Settings Panel       │   │
│  │  ├─ Node Creation  │   │  ├─ History Panel        │   │
│  │  ├─ Accessibility  │   │  ├─ AI Agent (streaming) │   │
│  │  └─ Code Export    │   │  ├─ Tool Executor        │   │
│  └───────────────────┘   │  ├─ Design Knowledge (12) │   │
│       postMessage ▲ ▼    │  └─ MCP Bridge Client     │   │
│                          └──────────┬───────────────┘   │
└─────────────────────────────────────┼───────────────────┘
                                      │ WebSocket
┌─────────────────────────────────────┼───────────────────┐
│  MCP Server (lotus-mcp)       │                   │
│  ├─ stdio transport (MCP SDK)  ◄────┘                   │
│  ├─ WebSocket bridge                                    │
│  └─ Tool definitions (Zod schemas)                      │
└─────────────────────────────────────────────────────────┘
         ▲ stdio
         │
  ┌──────┴──────┐
  │  MCP Client │  (Cursor / Claude Code / Windsurf)
  └─────────────┘
```

## Design Knowledge System

Lotus injects contextual design knowledge into the AI system prompt based on the active mode. 12 modules are available:

| Module | Priority | Modes |
|--------|----------|-------|
| Typography | 1 | Generate, Modify, Style Transfer, Components, Critique |
| Color | 2 | Generate, Modify, Style Transfer, Components, Critique |
| Layout | 3 | Generate, Modify, Components, Critique |
| Anti-Slop | 4 | Generate, Modify, Style Transfer, Components, Critique |
| Craft | 5 | Generate, Modify, Components, Critique |
| Icons | 6 | Generate, Modify, Components, Critique |
| Responsive | 7 | Generate, Components, Critique |
| Motion | 8 | Generate, Modify, Components |
| Data Visualization | 9 | Generate, Components, Critique |
| Interaction States | 10 | Generate, Components, Critique |
| Critique Rubric | 1 | Critique only |

Modules are selected by mode, sorted by priority, and concatenated up to a configurable token budget (default 4000 tokens).

## Development

```bash
# Development with hot reload
npm run dev

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Test coverage
npm run test:coverage

# Build for distribution
npm run package

# Type check
npx tsc --noEmit
```

### Directory Structure

```
lotus/
├── manifest.json                     # Figma plugin manifest
├── package.json
├── webpack.config.js                 # Dual-bundle webpack config
├── vitest.config.ts                  # Test configuration
├── src/
│   ├── plugin/                       # Plugin sandbox (code.js)
│   │   ├── controller.ts             # Message handler & routing
│   │   ├── nodes/                    # Node creation & traversal
│   │   ├── accessibility/            # WCAG auditing & color math
│   │   └── codegen/                  # Code export (React/Vue/Svelte/HTML)
│   └── ui/                           # UI iframe (React)
│       ├── App.tsx                    # Root component & mode management
│       ├── components/               # Chat, Settings, History panels
│       ├── hooks/                    # usePlugin, useSettings, useChat, etc.
│       ├── providers/                # AI provider adapters (streaming)
│       ├── agent/                    # Tool definitions, executor, system prompt
│       │   ├── design-knowledge/     # 12 knowledge modules
│       │   ├── json-repair.ts        # Malformed JSON repair
│       │   └── node-spec.ts          # Args → Figma node tree conversion
│       ├── crypto/                   # AES-256-GCM key encryption
│       └── lib/                      # MCP bridge client
├── mcp-server/                       # MCP server package
│   ├── package.json
│   └── src/
│       ├── server.ts                 # MCP stdio + WebSocket server
│       ├── bridge.ts                 # WebSocket bridge to UI iframe
│       └── tools.ts                  # Tool definitions with Zod schemas
└── scripts/
    └── package-plugin.sh             # Build & zip for distribution
```

## License

MIT
