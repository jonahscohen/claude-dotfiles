import { z } from 'zod';

/**
 * MCP tool definitions for Lotus.
 * Each tool maps to a plugin message type. The Zod schemas are used by the MCP SDK
 * for input validation, and the `pluginMessage` function converts validated args
 * into the plugin message format.
 */

export interface McpToolDef {
  name: string;
  description: string;
  schema: z.ZodObject<z.ZodRawShape>;
  pluginMessage: (args: Record<string, unknown>, requestId: string) => Record<string, unknown>;
}

const rgbSchema = z.object({ r: z.number(), g: z.number(), b: z.number() }).optional();
const rgbaSchema = z.object({ r: z.number(), g: z.number(), b: z.number(), a: z.number() }).optional();

// ── Helpers ─────────────────────────────────────────────────────────────────

type RGB = { r: number; g: number; b: number };

function buildFills(color?: RGB) {
  if (!color) return undefined;
  return [{ type: 'SOLID' as const, color, opacity: 1 }];
}

function buildStrokes(color?: RGB, weight?: number) {
  const result: Record<string, unknown> = {};
  if (color) result.strokes = [{ type: 'SOLID' as const, color, opacity: 1 }];
  if (weight !== undefined) result.strokeWeight = weight;
  return result;
}

function buildLayout(args: Record<string, unknown>) {
  const keys = ['layoutMode', 'itemSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'] as const;
  const layout: Record<string, unknown> = {};
  let hasValue = false;
  for (const k of keys) {
    if (args[k] !== undefined) {
      layout[k] = args[k];
      hasValue = true;
    }
  }
  return hasValue ? layout : undefined;
}

function buildTextStyle(args: Record<string, unknown>) {
  return {
    characters: args.characters as string,
    style: {
      fontFamily: (args.fontFamily as string) ?? 'Inter',
      fontStyle: (args.fontStyle as string) ?? 'Regular',
      fontSize: (args.fontSize as number) ?? 14,
      lineHeight: 'AUTO' as const,
      letterSpacing: 0,
      textAlignHorizontal: 'LEFT' as const,
      textAlignVertical: 'TOP' as const,
    },
  };
}

/** Remove keys whose value is undefined to keep messages clean. */
function clean<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}

// ── Tool definitions ────────────────────────────────────────────────────────

export const mcpTools: McpToolDef[] = [
  // ── Read & Inspect ──────────────────────────────────────────────────────
  {
    name: 'get_selection_context',
    description: 'Get detailed information about the currently selected nodes in Figma.',
    schema: z.object({}),
    pluginMessage: (_args, requestId) => ({ type: 'get-selection', requestId }),
  },
  {
    name: 'get_design_system',
    description: 'Retrieve local styles, variables, and components from the current Figma file.',
    schema: z.object({}),
    pluginMessage: (_args, requestId) => ({ type: 'get-design-system', requestId }),
  },
  {
    name: 'read_node_properties',
    description: 'Read detailed properties of a specific node by ID.',
    schema: z.object({
      nodeId: z.string().describe('The ID of the node to inspect'),
      depth: z.number().optional().describe('How many levels of children to include (default 2)'),
    }),
    pluginMessage: (args, requestId) => ({ type: 'read-node-properties', requestId, ...args }),
  },
  {
    name: 'get_page_structure',
    description: 'Get the full layer tree of the current page.',
    schema: z.object({
      depth: z.number().optional().describe('Max depth to traverse (default 3)'),
    }),
    pluginMessage: (args, requestId) => ({ type: 'get-page-context', requestId, ...args }),
  },
  {
    name: 'find_nodes',
    description: 'Search for nodes by name pattern and/or type.',
    schema: z.object({
      name: z.string().optional().describe('Name pattern to search (case-insensitive)'),
      type: z.enum(['FRAME', 'TEXT', 'RECTANGLE', 'ELLIPSE', 'LINE', 'COMPONENT', 'INSTANCE', 'GROUP', 'VECTOR']).optional(),
      parentId: z.string().optional().describe('Limit search to children of this node'),
    }),
    pluginMessage: (args, requestId) => ({ type: 'find-nodes', requestId, ...args }),
  },
  {
    name: 'list_available_fonts',
    description: 'List available fonts, optionally filtered by name.',
    schema: z.object({
      search: z.string().optional(),
      limit: z.number().optional().describe('Max fonts to return (default 50)'),
    }),
    pluginMessage: (args, requestId) => ({ type: 'list-fonts', requestId, ...args }),
  },

  // ── Create & Layout ─────────────────────────────────────────────────────
  {
    name: 'create_frame',
    description: 'Create an auto-layout frame on the canvas.',
    schema: z.object({
      name: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      layoutMode: z.enum(['HORIZONTAL', 'VERTICAL', 'NONE']).optional(),
      itemSpacing: z.number().optional(),
      paddingTop: z.number().optional(),
      paddingRight: z.number().optional(),
      paddingBottom: z.number().optional(),
      paddingLeft: z.number().optional(),
      fillColor: rgbSchema,
      cornerRadius: z.number().optional(),
      parentId: z.string().optional(),
    }),
    pluginMessage: (args, requestId) => ({
      type: 'create-node',
      requestId,
      node: clean({
        type: 'FRAME',
        parentId: args.parentId as string | undefined,
        properties: clean({
          name: args.name,
          width: args.width,
          height: args.height,
          x: args.x,
          y: args.y,
          cornerRadius: args.cornerRadius,
          fills: buildFills(args.fillColor as RGB | undefined),
          layout: buildLayout(args),
        } as Record<string, unknown>),
      } as Record<string, unknown>),
    }),
  },
  {
    name: 'create_text',
    description: 'Create a text node.',
    schema: z.object({
      characters: z.string(),
      name: z.string().optional(),
      fontSize: z.number().optional(),
      fontFamily: z.string().optional(),
      fontStyle: z.string().optional(),
      textColor: rgbSchema,
      parentId: z.string().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
    }),
    pluginMessage: (args, requestId) => ({
      type: 'create-node',
      requestId,
      node: clean({
        type: 'TEXT',
        parentId: args.parentId as string | undefined,
        properties: clean({
          name: args.name,
          x: args.x,
          y: args.y,
          fills: buildFills(args.textColor as RGB | undefined),
          text: buildTextStyle(args),
        } as Record<string, unknown>),
      } as Record<string, unknown>),
    }),
  },
  {
    name: 'create_rectangle',
    description: 'Create a rectangle or generic shape.',
    schema: z.object({
      name: z.string(),
      width: z.number(),
      height: z.number(),
      fillColor: rgbSchema,
      cornerRadius: z.number().optional(),
      strokeColor: rgbSchema,
      strokeWeight: z.number().optional(),
      parentId: z.string().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
    }),
    pluginMessage: (args, requestId) => ({
      type: 'create-node',
      requestId,
      node: clean({
        type: 'RECTANGLE',
        parentId: args.parentId as string | undefined,
        properties: clean({
          name: args.name,
          width: args.width,
          height: args.height,
          x: args.x,
          y: args.y,
          cornerRadius: args.cornerRadius,
          fills: buildFills(args.fillColor as RGB | undefined),
          ...buildStrokes(args.strokeColor as RGB | undefined, args.strokeWeight as number | undefined),
        } as Record<string, unknown>),
      } as Record<string, unknown>),
    }),
  },
  {
    name: 'create_svg_node',
    description: 'Create a vector graphic from SVG markup.',
    schema: z.object({
      name: z.string(),
      svg: z.string().describe('SVG markup string'),
      width: z.number().optional(),
      height: z.number().optional(),
      parentId: z.string().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
    }),
    pluginMessage: (args, requestId) => ({ type: 'create-svg-node', requestId, ...args }),
  },
  {
    name: 'create_design',
    description: 'Create an entire UI design in one call from a JSON spec.',
    schema: z.object({
      nodes_json: z.string().describe('JSON string of the nested node tree'),
      parentId: z.string().optional(),
    }),
    pluginMessage: (args, requestId) => {
      const raw = args.nodes_json as string;
      let nodes;
      try {
        nodes = JSON.parse(raw);
      } catch (e) {
        // Detect truncation: if JSON doesn't end with } or ], it was cut off mid-generation
        const trimmed = raw.trimEnd();
        const isTruncated = trimmed.length > 0 && !trimmed.endsWith('}') && !trimmed.endsWith(']');
        const errMsg = isTruncated
          ? `JSON was truncated at ${raw.length} characters (output token limit reached). Use individual create_frame/create_text calls instead of create_design for complex layouts.`
          : `Invalid JSON in nodes_json: ${(e as Error).message}`;
        return { type: 'batch-create-nodes', requestId, nodes: [], parentId: args.parentId, error: errMsg };
      }
      return { type: 'batch-create-nodes', requestId, nodes, parentId: args.parentId };
    },
  },
  {
    name: 'move_to_parent',
    description: 'Move a node to a new parent frame.',
    schema: z.object({
      nodeId: z.string(),
      parentId: z.string(),
      index: z.number().optional(),
    }),
    pluginMessage: (args, requestId) => ({ type: 'move-to-parent', requestId, ...args }),
  },

  // ── Modify & Style ──────────────────────────────────────────────────────
  {
    name: 'modify_node',
    description: 'Modify properties of an existing node. Only include properties to change.',
    schema: z.object({
      nodeId: z.string(),
      name: z.string().optional(),
      x: z.number().optional(),
      y: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      fillColor: rgbSchema,
      opacity: z.number().optional(),
      cornerRadius: z.number().optional(),
      visible: z.boolean().optional(),
      layoutMode: z.enum(['HORIZONTAL', 'VERTICAL', 'NONE']).optional(),
      itemSpacing: z.number().optional(),
      characters: z.string().optional().describe('For text nodes: new text content'),
      fontSize: z.number().optional(),
      fontFamily: z.string().optional(),
      fontStyle: z.string().optional(),
      textColor: rgbSchema,
    }),
    pluginMessage: (args, requestId) => {
      const {
        nodeId, name, x, y, width, height, fillColor, opacity,
        cornerRadius, visible, layoutMode, itemSpacing,
        characters, fontSize, fontFamily, fontStyle, textColor,
      } = args as Record<string, unknown>;

      const properties: Record<string, unknown> = {};
      if (name !== undefined) properties.name = name;
      if (x !== undefined) properties.x = x;
      if (y !== undefined) properties.y = y;
      if (width !== undefined) properties.width = width;
      if (height !== undefined) properties.height = height;
      if (opacity !== undefined) properties.opacity = opacity;
      if (cornerRadius !== undefined) properties.cornerRadius = cornerRadius;
      if (visible !== undefined) properties.visible = visible;
      if (fillColor) properties.fills = [{ type: 'SOLID', color: fillColor, opacity: 1 }];

      if (layoutMode !== undefined || itemSpacing !== undefined) {
        const layout: Record<string, unknown> = {};
        if (layoutMode !== undefined) layout.layoutMode = layoutMode;
        if (itemSpacing !== undefined) layout.itemSpacing = itemSpacing;
        properties.layout = layout;
      }

      if (characters !== undefined || fontSize !== undefined || fontFamily !== undefined || fontStyle !== undefined || textColor !== undefined) {
        if (characters !== undefined) {
          properties.text = {
            characters,
            style: {
              fontFamily: (fontFamily as string) ?? 'Inter',
              fontStyle: (fontStyle as string) ?? 'Regular',
              fontSize: (fontSize as number) ?? 14,
              lineHeight: 'AUTO',
              letterSpacing: 0,
              textAlignHorizontal: 'LEFT',
              textAlignVertical: 'TOP',
            },
          };
        }
        if (textColor) properties.fills = [{ type: 'SOLID', color: textColor, opacity: 1 }];
      }

      return { type: 'modify-node', requestId, nodeId, properties };
    },
  },
  {
    name: 'set_fill',
    description: 'Apply solid or gradient fills to a node.',
    schema: z.object({
      nodeId: z.string(),
      fills: z.array(z.object({
        type: z.enum(['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND']),
        color: rgbSchema,
        opacity: z.number().optional(),
        gradientStops: z.array(z.object({
          position: z.number(),
          color: rgbaSchema,
        })).optional(),
      })),
    }),
    pluginMessage: (args, requestId) => ({ type: 'set-fill', requestId, ...args }),
  },
  {
    name: 'set_stroke',
    description: 'Set stroke properties on a node.',
    schema: z.object({
      nodeId: z.string(),
      color: rgbSchema,
      weight: z.number().optional(),
      align: z.enum(['CENTER', 'INSIDE', 'OUTSIDE']).optional(),
      remove: z.boolean().optional(),
    }),
    pluginMessage: (args, requestId) => ({ type: 'set-stroke', requestId, ...args }),
  },
  {
    name: 'set_effects',
    description: 'Set shadow and blur effects on a node.',
    schema: z.object({
      nodeId: z.string(),
      effects: z.array(z.object({
        type: z.enum(['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR']),
        color: rgbaSchema,
        offset: z.object({ x: z.number(), y: z.number() }).optional(),
        radius: z.number().optional(),
        spread: z.number().optional(),
      })),
    }),
    pluginMessage: (args, requestId) => ({ type: 'set-effects', requestId, ...args }),
  },
  {
    name: 'delete_node',
    description: 'Delete a node from the canvas.',
    schema: z.object({
      nodeId: z.string(),
    }),
    pluginMessage: (args, requestId) => ({ type: 'delete-node', requestId, ...args }),
  },
  {
    name: 'set_selection',
    description: 'Select specific nodes and optionally zoom to them.',
    schema: z.object({
      nodeIds: z.array(z.string()),
      zoomToFit: z.boolean().optional().default(true),
    }),
    pluginMessage: (args, requestId) => ({ type: 'set-selection', requestId, ...args }),
  },

  // ── Export ──────────────────────────────────────────────────────────────
  {
    name: 'export_as_svg',
    description: 'Export a node as SVG markup.',
    schema: z.object({
      nodeId: z.string(),
    }),
    pluginMessage: (args, requestId) => ({ type: 'export-as-svg', requestId, ...args }),
  },
  {
    name: 'export_code',
    description: 'Export a node as production code (React, Vue, Svelte, or HTML/Tailwind).',
    schema: z.object({
      nodeId: z.string(),
      framework: z.enum(['react', 'vue', 'svelte', 'html-tailwind']),
    }),
    pluginMessage: (args, requestId) => ({ type: 'export-code', requestId, ...args }),
  },
  {
    name: 'screenshot_node',
    description: 'Take a screenshot of a node as base64 PNG.',
    schema: z.object({
      nodeId: z.string(),
      scale: z.number().optional().default(0.25),
    }),
    pluginMessage: (args, requestId) => ({
      type: 'export-png',
      requestId,
      nodeId: args.nodeId,
      scale: args.scale,
    }),
  },

  // ── Analysis ────────────────────────────────────────────────────────────
  {
    name: 'analyze_accessibility',
    description: 'Run a WCAG accessibility audit on a node.',
    schema: z.object({
      nodeId: z.string().optional(),
    }),
    pluginMessage: (args, requestId) => ({ type: 'run-accessibility-audit', requestId, ...args }),
  },
  {
    name: 'apply_style_transfer',
    description: 'Copy styles from a source node to target nodes.',
    schema: z.object({
      sourceNodeId: z.string(),
      targetNodeIds: z.array(z.string()),
    }),
    pluginMessage: (args, requestId) => ({ type: 'apply-style-transfer', requestId, ...args }),
  },

  // ── Variables ───────────────────────────────────────────────────────────
  {
    name: 'get_variables',
    description: 'List all variable collections and tokens.',
    schema: z.object({}),
    pluginMessage: (_args, requestId) => ({ type: 'get-variables', requestId }),
  },
  {
    name: 'create_variable',
    description: 'Create a variable/token in a collection.',
    schema: z.object({
      collectionId: z.string(),
      name: z.string(),
      type: z.enum(['COLOR', 'FLOAT', 'STRING', 'BOOLEAN']),
      values: z.record(z.unknown()).optional(),
    }),
    pluginMessage: (args, requestId) => ({ type: 'create-variable', requestId, ...args }),
  },
  {
    name: 'bind_variable',
    description: 'Bind a variable to a node property.',
    schema: z.object({
      nodeId: z.string(),
      property: z.string(),
      variableId: z.string(),
    }),
    pluginMessage: (args, requestId) => ({ type: 'bind-variable', requestId, ...args }),
  },

  // ── Agent ─────────────────────────────────────────────────────────────
  {
    name: 'send_prompt',
    description: 'Send a design prompt to the Lotus AI agent. The agent will create or modify designs on the canvas following all design rules, QA loops, and system prompt guidelines. Use this instead of manually creating nodes.',
    schema: z.object({
      prompt: z.string().describe('The design request in natural language, e.g. "Design a mobile messaging screen with dark theme"'),
    }),
    pluginMessage: (args, requestId) => ({ type: 'send-prompt', requestId, prompt: args.prompt }),
  },

  // ── Chat & Session Control ──────────────────────────────────────────
  {
    name: 'cancel_stream',
    description: 'Cancel the currently streaming AI response. Use when the agent is busy or stuck.',
    schema: z.object({}),
    pluginMessage: (_args, requestId) => ({ type: 'cancel-stream', requestId }),
  },
  {
    name: 'clear_chat',
    description: 'Clear all chat messages and start a fresh conversation.',
    schema: z.object({}),
    pluginMessage: (_args, requestId) => ({ type: 'clear-chat', requestId }),
  },
  {
    name: 'new_conversation',
    description: 'Save the current conversation to history and start a new one. Equivalent to pressing "New Task" in the UI.',
    schema: z.object({}),
    pluginMessage: (_args, requestId) => ({ type: 'new-conversation', requestId }),
  },
  {
    name: 'get_chat_status',
    description: 'Get current chat state: whether the agent is streaming, message count, and token usage.',
    schema: z.object({}),
    pluginMessage: (_args, requestId) => ({ type: 'get-chat-status', requestId }),
  },
  {
    name: 'get_chat_messages',
    description: 'Get the current conversation messages.',
    schema: z.object({
      limit: z.number().optional().describe('Max messages to return from the end (default all)'),
    }),
    pluginMessage: (args, requestId) => ({ type: 'get-chat-messages', requestId, limit: args.limit }),
  },

  // ── Mode ─────────────────────────────────────────────────────────────
  {
    name: 'set_mode',
    description: 'Switch the agent mode. Modes: generate, modify, style-transfer, components, code-export, audit, critique.',
    schema: z.object({
      mode: z.enum(['generate', 'modify', 'style-transfer', 'components', 'code-export', 'audit', 'critique']),
    }),
    pluginMessage: (args, requestId) => ({ type: 'set-mode', requestId, mode: args.mode }),
  },
  {
    name: 'get_mode',
    description: 'Get the current agent mode.',
    schema: z.object({}),
    pluginMessage: (_args, requestId) => ({ type: 'get-mode', requestId }),
  },

  // ── History ──────────────────────────────────────────────────────────
  {
    name: 'list_conversations',
    description: 'List all saved conversation history entries.',
    schema: z.object({}),
    pluginMessage: (_args, requestId) => ({ type: 'list-conversations', requestId }),
  },
  {
    name: 'load_conversation',
    description: 'Load a previously saved conversation by ID.',
    schema: z.object({
      id: z.string().describe('Conversation ID from list_conversations'),
    }),
    pluginMessage: (args, requestId) => ({ type: 'load-conversation', requestId, id: args.id }),
  },
  {
    name: 'save_conversation',
    description: 'Save the current conversation to history.',
    schema: z.object({}),
    pluginMessage: (_args, requestId) => ({ type: 'save-conversation', requestId }),
  },
  {
    name: 'delete_conversation',
    description: 'Delete a saved conversation by ID.',
    schema: z.object({
      id: z.string().describe('Conversation ID to delete'),
    }),
    pluginMessage: (args, requestId) => ({ type: 'delete-conversation', requestId, id: args.id }),
  },
];
