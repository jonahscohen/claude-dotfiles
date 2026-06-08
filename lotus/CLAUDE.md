# Lotus

AI-powered design agent plugin for Figma. Multi-provider (Anthropic, OpenAI, Google), multi-turn, context-aware design generation and modification via BYOK.

## Quick Reference

```bash
npm run build        # Production build (dist/code.js + dist/ui.html)
npm run dev          # Dev build + watch
npm test             # Vitest tests
npm run test:watch   # Vitest watch mode
npm run package      # Package plugin for distribution
npm run mcp          # Start the MCP bridge server
```

## Architecture

Two webpack bundles compiled from a single TypeScript codebase:

### Plugin Bundle (`src/plugin/` -> `dist/code.js`)
Runs in Figma's plugin sandbox (no DOM, no network). Handles canvas operations:
- `controller.ts` - Message router between UI and Figma API
- `nodes/reader.ts` - Parse selected Figma nodes into structured data
- `nodes/creator.ts` - Create/insert design elements on canvas
- `nodes/modifier.ts` - Update existing node properties
- `codegen/react.ts` - Export designs to React code
- `accessibility/auditor.ts` - WCAG compliance analysis
- `types.ts` - Shared type definitions

### UI Bundle (`src/ui/` -> `dist/ui.html`)
React app in Figma's UI iframe. All JS/CSS inlined into a single HTML file via HtmlInlineScriptPlugin.

**Agent system** (`src/ui/agent/`):
- `executor.ts` - Core agent execution engine (tool-use loop, streaming)
- `tools.ts` - Tool definitions exposed to AI models
- `system-prompt.ts` - System instructions for the design agent
- `context.ts` - Selection/page context management
- `history.ts` - Conversation tracking

**AI providers** (`src/ui/providers/`):
- `base.ts` - Provider interface (streaming, tool use)
- `anthropic.ts`, `openai.ts`, `google.ts` - Provider implementations
- `manager.ts` - Provider selection and orchestration

**Key hooks**: `useChat.ts` (chat logic), `useHistory.ts` (conversation persistence)

**Crypto**: `crypto/keys.ts` - API key encryption/storage (BYOK)

### MCP Server (`mcp-server/`)
Node.js bridge that exposes Figma plugin capabilities as MCP tools. Connects to the plugin via localhost WebSocket (port 9527).

## Important Conventions

- **Colors are 0-1 floats**, not 0-255. White = `{r:1, g:1, b:1}`.
- **All containers must use auto-layout** (`HORIZONTAL` or `VERTICAL`).
- **8px spacing grid**: use values from `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.
- **WCAG AA minimum**: 4.5:1 for body text, 3:1 for large text.
- **Text in auto-layout** must set `layoutSizingHorizontal: "FILL"`.
- **Icons**: always use SVG from icon libraries, never draw from primitives.
- Path aliases: `@plugin/*` -> `src/plugin/*`, `@ui/*` -> `src/ui/*`.
- TypeScript strict mode. Target ES2017, module ESNext.
- Tests live in `__tests__` directories adjacent to source.

## Network Access

The plugin calls AI provider APIs directly from the UI iframe (BYOK):
- `api.anthropic.com` (Claude)
- `api.openai.com` (GPT)
- `generativelanguage.googleapis.com` (Gemini)
- `localhost:9527` (MCP bridge, dev only)

## Gotcha: Gemini Tool Schema

`create_design` uses a single JSON string parameter instead of a nested object schema. This is a workaround for Gemini's function-calling schema complexity limits. The executor `JSON.parse`s the string and reconstructs the tree. See the comment at the top of `tools.ts`.
