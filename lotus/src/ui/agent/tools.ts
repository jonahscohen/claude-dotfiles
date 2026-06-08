import type { ToolDefinition } from '../providers/base';
import type { AppMode } from '../App';

// Note: create_design uses a single JSON string parameter to avoid
// Gemini's function-calling schema complexity limits. The executor
// JSON.parses the string and reconstructs the tree.

const allTools: ToolDefinition[] = [
  // ────────────────────────────────────────────────────────────────────────────
  // CREATE & LAYOUT
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: 'create_frame',
    description: 'Create an auto-layout frame on the Figma canvas. Use this as a container for other elements.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Layer name for the frame' },
        width: { type: 'number', description: 'Width in pixels' },
        height: { type: 'number', description: 'Height in pixels' },
        x: { type: 'number', description: 'X position (optional, defaults to viewport center)' },
        y: { type: 'number', description: 'Y position (optional, defaults to viewport center)' },
        layoutMode: { type: 'string', enum: ['HORIZONTAL', 'VERTICAL', 'NONE'], description: 'Auto-layout direction' },
        itemSpacing: { type: 'number', description: 'Space between children in px' },
        paddingTop: { type: 'number' },
        paddingRight: { type: 'number' },
        paddingBottom: { type: 'number' },
        paddingLeft: { type: 'number' },
        primaryAxisAlignItems: { type: 'string', enum: ['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN'] },
        counterAxisAlignItems: { type: 'string', enum: ['MIN', 'CENTER', 'MAX'] },
        primaryAxisSizingMode: { type: 'string', enum: ['FIXED', 'AUTO'] },
        counterAxisSizingMode: { type: 'string', enum: ['FIXED', 'AUTO'] },
        fillColor: { type: 'object', properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' } }, description: 'Background color (0-1 RGB)' },
        cornerRadius: { type: 'number', description: 'Corner radius in px' },
        clipsContent: { type: 'boolean', description: 'Whether to clip overflowing children' },
        parentId: { type: 'string', description: 'ID of parent frame to nest this inside (optional)' },
        effects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR'] },
              color: { type: 'object', properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' }, a: { type: 'number' } } },
              offset: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } },
              radius: { type: 'number' },
              spread: { type: 'number' },
            },
          },
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_text',
    description: 'Create a text node on the canvas or inside a parent frame.',
    parameters: {
      type: 'object',
      properties: {
        characters: { type: 'string', description: 'The text content to display' },
        name: { type: 'string', description: 'Layer name' },
        fontSize: { type: 'number', description: 'Font size in px (default 14)' },
        fontFamily: { type: 'string', description: 'Font family (default Inter)' },
        fontStyle: { type: 'string', description: 'Font style: Regular, Medium, SemiBold, Bold (default Regular)' },
        textColor: { type: 'object', properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' } }, description: 'Text color (0-1 RGB)' },
        textAlignHorizontal: { type: 'string', enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'] },
        lineHeight: { type: 'number', description: 'Line height in px' },
        letterSpacing: { type: 'number', description: 'Letter spacing in px' },
        parentId: { type: 'string', description: 'ID of parent frame (optional)' },
        x: { type: 'number' },
        y: { type: 'number' },
      },
      required: ['characters'],
    },
  },
  {
    name: 'create_rectangle',
    description: 'Create a rectangle or generic shape.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Layer name' },
        width: { type: 'number', description: 'Width in px' },
        height: { type: 'number', description: 'Height in px' },
        fillColor: { type: 'object', properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' } } },
        cornerRadius: { type: 'number' },
        strokeColor: { type: 'object', properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' } } },
        strokeWeight: { type: 'number' },
        opacity: { type: 'number' },
        parentId: { type: 'string', description: 'ID of parent frame (optional)' },
        x: { type: 'number' },
        y: { type: 'number' },
      },
      required: ['name', 'width', 'height'],
    },
  },
  {
    name: 'create_ellipse',
    description: 'Create a circle or oval shape.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Layer name' },
        width: { type: 'number', description: 'Width in px' },
        height: { type: 'number', description: 'Height in px (same as width for circle)' },
        fillColor: { type: 'object', properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' } } },
        cornerRadius: { type: 'number' },
        strokeColor: { type: 'object', properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' } } },
        strokeWeight: { type: 'number' },
        opacity: { type: 'number' },
        parentId: { type: 'string', description: 'ID of parent frame (optional)' },
        x: { type: 'number' },
        y: { type: 'number' },
      },
      required: ['name', 'width', 'height'],
    },
  },
  {
    name: 'create_line',
    description: 'Create a line or divider.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Layer name' },
        length: { type: 'number', description: 'Length of the line in px' },
        strokeColor: { type: 'object', properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' } }, description: 'Line color (0-1 RGB)' },
        strokeWeight: { type: 'number', description: 'Line thickness in px (default 1)' },
        opacity: { type: 'number' },
        parentId: { type: 'string', description: 'ID of parent frame (optional)' },
        x: { type: 'number' },
        y: { type: 'number' },
      },
      required: ['name', 'length'],
    },
  },
  {
    name: 'create_svg_node',
    description: 'Create a vector graphic node from SVG markup. Use for icons, logos, and custom vector shapes.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Layer name for the created node' },
        svg: { type: 'string', description: 'SVG markup string (e.g., "<svg>...</svg>")' },
        width: { type: 'number', description: 'Desired width (scales the SVG)' },
        height: { type: 'number', description: 'Desired height (scales the SVG)' },
        parentId: { type: 'string', description: 'ID of parent frame (optional)' },
        x: { type: 'number' },
        y: { type: 'number' },
      },
      required: ['name', 'svg'],
    },
  },
  {
    name: 'move_to_parent',
    description: 'Move a node to a new parent frame, restructuring the layer hierarchy.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the node to move' },
        parentId: { type: 'string', description: 'ID of the new parent frame' },
        index: { type: 'number', description: 'Position among siblings (0 = first, omit for last)' },
      },
      required: ['nodeId', 'parentId'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // MODIFY & STYLE
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: 'modify_node',
    description: 'Modify properties of an existing Figma node by its ID. Only include properties you want to change -- omitted properties are preserved. For text nodes: do NOT include fontFamily/fontStyle unless explicitly changing the font; existing fonts are preserved automatically.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The ID of the node to modify' },
        name: { type: 'string' },
        x: { type: 'number' },
        y: { type: 'number' },
        width: { type: 'number' },
        height: { type: 'number' },
        rotation: { type: 'number', description: 'Rotation in degrees' },
        // Fill
        fillColor: { type: 'object', properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' } }, description: 'Fill color (0-1 RGB). Omit to leave unchanged.' },
        fillOpacity: { type: 'number', description: 'Fill opacity 0-1 (0 = fully transparent). Only applies when fillColor is also set.' },
        removeFills: { type: 'boolean', description: 'Set to true to remove all fills (make background transparent).' },
        // Stroke
        strokeColor: { type: 'object', properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' } }, description: 'Stroke color (0-1 RGB).' },
        strokeWeight: { type: 'number', description: 'Stroke thickness in px.' },
        strokeAlign: { type: 'string', enum: ['CENTER', 'INSIDE', 'OUTSIDE'], description: 'Stroke alignment.' },
        removeStrokes: { type: 'boolean', description: 'Set to true to remove all strokes.' },
        // Effects
        effects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR'] },
              color: { type: 'object', properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' }, a: { type: 'number' } } },
              offset: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } },
              radius: { type: 'number' },
              spread: { type: 'number' },
            },
          },
          description: 'Replace effects with this array. Pass empty array to remove all effects.',
        },
        // Appearance
        opacity: { type: 'number', description: 'Node opacity 0-1 (affects entire node including children).' },
        cornerRadius: { type: 'number' },
        visible: { type: 'boolean' },
        clipsContent: { type: 'boolean', description: 'Whether frame clips overflowing children.' },
        // Layout
        layoutMode: { type: 'string', enum: ['HORIZONTAL', 'VERTICAL', 'NONE'] },
        itemSpacing: { type: 'number' },
        paddingTop: { type: 'number' },
        paddingRight: { type: 'number' },
        paddingBottom: { type: 'number' },
        paddingLeft: { type: 'number' },
        primaryAxisAlignItems: { type: 'string', enum: ['MIN', 'CENTER', 'MAX', 'SPACE_BETWEEN'] },
        counterAxisAlignItems: { type: 'string', enum: ['MIN', 'CENTER', 'MAX'] },
        primaryAxisSizingMode: { type: 'string', enum: ['FIXED', 'AUTO'] },
        counterAxisSizingMode: { type: 'string', enum: ['FIXED', 'AUTO'] },
        layoutSizingHorizontal: { type: 'string', enum: ['FIXED', 'HUG', 'FILL'], description: 'How this node sizes horizontally in its parent auto-layout.' },
        layoutSizingVertical: { type: 'string', enum: ['FIXED', 'HUG', 'FILL'], description: 'How this node sizes vertically in its parent auto-layout.' },
        // Text (for TEXT nodes)
        characters: { type: 'string', description: 'For text nodes: new text content' },
        fontSize: { type: 'number', description: 'For text nodes: new font size' },
        fontFamily: { type: 'string', description: 'For text nodes: font family' },
        fontStyle: { type: 'string', description: 'For text nodes: font style (Regular, Medium, SemiBold, Bold)' },
        textColor: { type: 'object', properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' } }, description: 'For text nodes: text color (0-1 RGB)' },
        textAlignHorizontal: { type: 'string', enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'], description: 'For text nodes: horizontal text alignment' },
        lineHeight: { type: 'number', description: 'For text nodes: line height in px' },
        letterSpacing: { type: 'number', description: 'For text nodes: letter spacing in px' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'set_fill',
    description: 'Apply advanced fills to a node -- solid colors, linear/radial/angular/diamond gradients, or multiple fills stacked.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The ID of the node' },
        fills: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND'] },
              color: { type: 'object', properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' } }, description: 'For SOLID fills' },
              opacity: { type: 'number', description: 'Fill opacity 0-1' },
              gradientStops: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    position: { type: 'number', description: '0-1 position along gradient' },
                    color: { type: 'object', properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' }, a: { type: 'number' } } },
                  },
                },
                description: 'For gradient fills',
              },
            },
          },
          description: 'Array of fill layers (bottom to top)',
        },
      },
      required: ['nodeId', 'fills'],
    },
  },
  {
    name: 'set_stroke',
    description: 'Set stroke (border) properties on a node.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The ID of the node' },
        color: { type: 'object', properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' } }, description: 'Stroke color (0-1 RGB)' },
        weight: { type: 'number', description: 'Stroke thickness in px' },
        align: { type: 'string', enum: ['CENTER', 'INSIDE', 'OUTSIDE'], description: 'Stroke alignment' },
        opacity: { type: 'number', description: 'Stroke opacity 0-1' },
        remove: { type: 'boolean', description: 'Set to true to remove all strokes' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'set_effects',
    description: 'Set shadow and blur effects on a node. Replaces existing effects.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The ID of the node' },
        effects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['DROP_SHADOW', 'INNER_SHADOW', 'LAYER_BLUR', 'BACKGROUND_BLUR'] },
              color: { type: 'object', properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' }, a: { type: 'number' } } },
              offset: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } } },
              radius: { type: 'number' },
              spread: { type: 'number' },
            },
          },
          description: 'Array of effects. Pass empty array to remove all effects.',
        },
      },
      required: ['nodeId', 'effects'],
    },
  },
  {
    name: 'delete_node',
    description: 'Delete a node from the canvas by its ID.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The ID of the node to delete' },
      },
      required: ['nodeId'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // READ & INSPECT
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: 'get_selection_context',
    description: 'Get detailed information about the currently selected nodes in Figma, including their properties, styles, and hierarchy.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_design_system',
    description: 'Retrieve all local styles, variables, and components from the current Figma file.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'read_node_properties',
    description: 'Read detailed properties of a specific node by ID, including fills, strokes, effects, layout, and text content.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The ID of the node to inspect' },
        depth: { type: 'number', description: 'How many levels of children to include (default 2)' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'get_page_structure',
    description: 'Get the full layer tree of the current page. Returns node names, types, IDs, and hierarchy.',
    parameters: {
      type: 'object',
      properties: {
        depth: { type: 'number', description: 'Max depth to traverse (default 3)' },
      },
    },
  },
  {
    name: 'find_nodes',
    description: 'Search for nodes on the current page by name pattern and/or type. Returns matching nodes with their IDs and properties.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name pattern to search (case-insensitive, supports regex)' },
        type: { type: 'string', enum: ['FRAME', 'TEXT', 'RECTANGLE', 'ELLIPSE', 'LINE', 'COMPONENT', 'INSTANCE', 'GROUP', 'VECTOR'], description: 'Filter by node type' },
        parentId: { type: 'string', description: 'Limit search to children of this node' },
      },
    },
  },
  {
    name: 'set_selection',
    description: 'Select specific nodes by ID and optionally zoom the viewport to them.',
    parameters: {
      type: 'object',
      properties: {
        nodeIds: { type: 'array', items: { type: 'string' }, description: 'Array of node IDs to select' },
        zoomToFit: { type: 'boolean', description: 'Whether to zoom the viewport to fit the selection (default true)' },
      },
      required: ['nodeIds'],
    },
  },
  {
    name: 'list_available_fonts',
    description: 'List available fonts in Figma, optionally filtered by a search string.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Filter fonts by name (optional)' },
        limit: { type: 'number', description: 'Max fonts to return (default 50)' },
      },
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // COMPONENTS & INSTANCES
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: 'create_component_instance',
    description: 'Create an instance of an existing component by its component ID.',
    parameters: {
      type: 'object',
      properties: {
        componentId: { type: 'string', description: 'ID of the main component to instantiate' },
        parentId: { type: 'string', description: 'ID of parent frame (optional)' },
        x: { type: 'number' },
        y: { type: 'number' },
        overrides: {
          type: 'object',
          description: 'Property overrides to apply (e.g., { "characters": "New Text" })',
        },
      },
      required: ['componentId'],
    },
  },
  {
    name: 'detach_instance',
    description: 'Detach a component instance, converting it to a regular frame that can be freely edited.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the component instance to detach' },
      },
      required: ['nodeId'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // VECTOR OPERATIONS
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: 'boolean_operation',
    description: 'Combine two or more nodes using a boolean operation (union, subtract, intersect, exclude).',
    parameters: {
      type: 'object',
      properties: {
        nodeIds: { type: 'array', items: { type: 'string' }, description: 'IDs of nodes to combine (order matters for subtract)' },
        operation: { type: 'string', enum: ['UNION', 'SUBTRACT', 'INTERSECT', 'EXCLUDE'], description: 'Boolean operation type' },
        name: { type: 'string', description: 'Name for the resulting node' },
      },
      required: ['nodeIds', 'operation'],
    },
  },
  {
    name: 'flatten_nodes',
    description: 'Flatten one or more nodes into a single editable vector.',
    parameters: {
      type: 'object',
      properties: {
        nodeIds: { type: 'array', items: { type: 'string' }, description: 'IDs of nodes to flatten' },
      },
      required: ['nodeIds'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // TYPOGRAPHY
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: 'style_text_range',
    description: 'Apply different styling to a specific character range within a text node. Use for mixed styling (e.g., bold a word, color a phrase).',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the text node' },
        start: { type: 'number', description: 'Start character index (0-based)' },
        end: { type: 'number', description: 'End character index (exclusive)' },
        fontSize: { type: 'number' },
        fontFamily: { type: 'string' },
        fontStyle: { type: 'string', description: 'Regular, Medium, SemiBold, Bold, etc.' },
        color: { type: 'object', properties: { r: { type: 'number' }, g: { type: 'number' }, b: { type: 'number' } }, description: 'Text color (0-1 RGB)' },
        letterSpacing: { type: 'number' },
        lineHeight: { type: 'number' },
        textDecoration: { type: 'string', enum: ['NONE', 'UNDERLINE', 'STRIKETHROUGH'] },
        textCase: { type: 'string', enum: ['ORIGINAL', 'UPPER', 'LOWER', 'TITLE'] },
      },
      required: ['nodeId', 'start', 'end'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // CONSTRAINTS
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: 'set_constraints',
    description: 'Set responsive constraints for a node (how it behaves when its parent resizes).',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The ID of the node' },
        horizontal: { type: 'string', enum: ['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE'], description: 'Horizontal constraint (MIN=pin left, MAX=pin right, STRETCH=pin both sides)' },
        vertical: { type: 'string', enum: ['MIN', 'CENTER', 'MAX', 'STRETCH', 'SCALE'], description: 'Vertical constraint (MIN=pin top, MAX=pin bottom, STRETCH=pin both sides)' },
      },
      required: ['nodeId'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // VARIABLES & TOKENS
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: 'get_variables',
    description: 'List all variable collections and their variables/tokens in the current file.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_variable_collection',
    description: 'Create a new variable/token collection with optional modes (e.g., Light, Dark).',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Collection name (e.g., "Colors", "Spacing")' },
        modes: { type: 'array', items: { type: 'string' }, description: 'Mode names (e.g., ["Light", "Dark"]). First mode is created automatically, additional modes are added.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'create_variable',
    description: 'Create a new variable/token in an existing collection.',
    parameters: {
      type: 'object',
      properties: {
        collectionId: { type: 'string', description: 'ID of the variable collection' },
        name: { type: 'string', description: 'Variable name (e.g., "primary-500", "spacing-md")' },
        type: { type: 'string', enum: ['COLOR', 'FLOAT', 'STRING', 'BOOLEAN'], description: 'Variable type' },
        values: {
          type: 'object',
          description: 'Values per mode. Keys are mode IDs or names, values depend on type. For COLOR: {r,g,b,a}. For FLOAT: number. For STRING: string. For BOOLEAN: boolean.',
        },
      },
      required: ['collectionId', 'name', 'type'],
    },
  },
  {
    name: 'bind_variable',
    description: 'Bind a variable/token to a node property for dynamic theming.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The node to bind to' },
        property: { type: 'string', description: 'Property to bind (e.g., "fills/0/color", "itemSpacing", "paddingTop", "cornerRadius", "opacity")' },
        variableId: { type: 'string', description: 'ID of the variable to bind' },
      },
      required: ['nodeId', 'property', 'variableId'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // EXPORT
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: 'export_as_svg',
    description: 'Export a node (or all children of a frame) as SVG markup.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the node to export' },
      },
      required: ['nodeId'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // AI-POWERED CREATIVE TOOLS
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: 'generate_svg',
    description: 'Generate an SVG graphic using AI. Describe what you want and the AI will produce SVG markup and insert it as a Figma vector node. Use for icons, illustrations, logos, and decorative graphics.',
    parameters: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Detailed description of the SVG to generate (e.g., "a minimalist house icon with a chimney")' },
        style: { type: 'string', enum: ['icon', 'illustration', 'logo', 'decorative'], description: 'Visual style category (default: icon)' },
        width: { type: 'number', description: 'Desired width in px (default 24 for icons, 200 for illustrations)' },
        height: { type: 'number', description: 'Desired height in px (default same as width)' },
        color: { type: 'string', description: 'Primary color as hex (e.g., "#1a1a1a"). Default: currentColor' },
        parentId: { type: 'string', description: 'ID of parent frame to insert into (optional)' },
      },
      required: ['description'],
    },
  },
  {
    name: 'image_to_svg',
    description: 'Convert a raster node (image, frame, or shape) to an SVG vector by exporting it as PNG and having the AI trace it into SVG paths. The AI analyzes the image and recreates it as clean vector markup.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the node to convert to SVG' },
        detail: { type: 'string', enum: ['low', 'medium', 'high'], description: 'Level of detail in the trace (default: medium). Low = simplified shapes, High = more path detail.' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'scan_design_system',
    description: 'Scan the current file for design system elements: local components, paint/text/effect/grid styles, and variables/tokens. Returns a filtered summary based on what you request.',
    parameters: {
      type: 'object',
      properties: {
        includeComponents: { type: 'boolean', description: 'Include local components and their variants (default true)' },
        includeStyles: { type: 'boolean', description: 'Include paint, text, effect, and grid styles (default true)' },
        includeVariables: { type: 'boolean', description: 'Include variable collections and tokens (default true)' },
      },
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // ANALYSIS & GENERATION
  // ────────────────────────────────────────────────────────────────────────────
  {
    name: 'analyze_accessibility',
    description: 'Run a WCAG accessibility audit on the selected nodes. Returns contrast issues, touch target problems, and fix suggestions.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'Specific node ID to audit (optional, defaults to selection)' },
      },
    },
  },
  {
    name: 'export_code',
    description: 'Export a Figma node as production code in the specified framework.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'The ID of the node to export' },
        framework: { type: 'string', enum: ['react', 'vue', 'svelte', 'html-tailwind'], description: 'Target framework' },
      },
      required: ['nodeId', 'framework'],
    },
  },
  {
    name: 'apply_style_transfer',
    description: 'Copy all visual styles (fills, strokes, effects, typography) from a source node to one or more target nodes.',
    parameters: {
      type: 'object',
      properties: {
        sourceNodeId: { type: 'string', description: 'Node to copy styles from' },
        targetNodeIds: { type: 'array', items: { type: 'string' }, description: 'Nodes to apply styles to' },
      },
      required: ['sourceNodeId', 'targetNodeIds'],
    },
  },
  {
    name: 'generate_component_set',
    description: 'Generate a Figma component set with Cartesian variants from a base node.',
    parameters: {
      type: 'object',
      properties: {
        baseNodeId: { type: 'string', description: 'ID of the base node to create variants from' },
        axes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Variant property name (e.g., Size, State)' },
              values: { type: 'array', items: { type: 'string' }, description: 'Variant values (e.g., Small, Medium, Large)' },
            },
            required: ['name', 'values'],
          },
          description: 'Variant axes for Cartesian generation',
        },
      },
      required: ['baseNodeId', 'axes'],
    },
  },
  {
    name: 'screenshot_node',
    description: 'Take a screenshot of a Figma node for visual QA. Use the rootNodeId from create_design result. Analyze for: text clipping, spacing issues, broken progress bars, contrast problems. Fix with modify_node if needed.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the node to screenshot (typically the root frame of your design)' },
        scale: { type: 'number', description: 'Export scale factor (default 0.15). Use 0.25 for higher detail if needed.' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'create_design',
    description: 'Create a SMALL UI design (under 15 nodes) in one call. WARNING: For complex layouts with many elements, this tool WILL FAIL due to JSON truncation. Use individual create_frame/create_text/create_rectangle calls instead. Pass a JSON string containing a single nested tree object (NOT an array). Returns rootNodeId for use with screenshot_node.',
    parameters: {
      type: 'object',
      properties: {
        nodes_json: {
          type: 'string',
          description: 'A JSON string of a single nested tree object. Root node with "children" arrays for nesting. Each node has: type (FRAME/TEXT/RECTANGLE/ELLIPSE), name, and type-specific properties. FRAME nodes use "children" to nest child nodes. See system prompt for full property list and examples.',
        },
        parentId: {
          type: 'string',
          description: 'ID of an existing frame/artboard to insert the design into. If omitted, design is placed on the canvas. Use this when building on an existing artboard.',
        },
      },
      required: ['nodes_json'],
    },
  },
];

export function getToolDefinitions(mode: AppMode): ToolDefinition[] {
  switch (mode) {
    case 'generate':
      return allTools.filter(t => [
        'create_design',
        'modify_node', 'delete_node',
        'get_design_system', 'get_selection_context',
        'set_fill', 'set_stroke', 'set_effects',
        'find_nodes', 'read_node_properties',
        'create_svg_node', 'list_available_fonts',
        'screenshot_node',
        'generate_svg', 'image_to_svg', 'scan_design_system',
      ].includes(t.name));

    case 'modify':
      return allTools.filter(t => [
        'modify_node', 'delete_node', 'get_selection_context',
        'get_design_system', 'read_node_properties', 'find_nodes',
        'create_frame', 'create_text', 'create_rectangle',
        'create_ellipse', 'create_line', 'create_svg_node',
        'set_fill', 'set_stroke', 'set_effects',
        'set_selection', 'move_to_parent',
        'set_constraints', 'style_text_range',
        'export_as_svg', 'screenshot_node',
        'generate_svg', 'image_to_svg', 'scan_design_system',
      ].includes(t.name));

    case 'style-transfer':
      return allTools.filter(t => [
        'apply_style_transfer', 'get_selection_context', 'get_design_system',
        'read_node_properties', 'find_nodes', 'set_fill', 'set_stroke', 'set_effects',
        'modify_node', 'screenshot_node',
      ].includes(t.name));

    case 'components':
      return allTools.filter(t => [
        'generate_component_set', 'create_frame', 'create_text',
        'create_rectangle', 'create_ellipse',
        'get_selection_context', 'get_design_system',
        'create_component_instance', 'detach_instance',
        'read_node_properties', 'find_nodes',
        'create_variable_collection', 'create_variable', 'bind_variable', 'get_variables',
        'modify_node', 'screenshot_node',
      ].includes(t.name));

    case 'code-export':
      return allTools.filter(t => [
        'export_code', 'get_selection_context', 'read_node_properties',
        'export_as_svg',
      ].includes(t.name));

    case 'audit':
      return allTools.filter(t => [
        'analyze_accessibility', 'get_selection_context', 'modify_node',
        'read_node_properties', 'find_nodes',
        'screenshot_node',
      ].includes(t.name));

    case 'critique':
      return allTools.filter(t => [
        'get_selection_context', 'read_node_properties', 'find_nodes',
        'screenshot_node', 'analyze_accessibility',
        'get_design_system', 'scan_design_system',
      ].includes(t.name));

    default:
      return allTools;
  }
}
