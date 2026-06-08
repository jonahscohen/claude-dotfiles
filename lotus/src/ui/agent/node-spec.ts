// ── Recursive converter: flat tool args -> SerializedNodeCreate tree ──────────
// Used by create_design to convert the AI's nested node description into
// the spec format that createNodeFromSpec expects on the plugin side.

import type { SerializedNodeCreate, NodeType } from '../../plugin/types';

export function argsToNodeSpec(args: Record<string, unknown>): SerializedNodeCreate {
  const nodeType = ((args.type as string) || 'FRAME') as NodeType;
  const spec: SerializedNodeCreate = {
    type: nodeType,
    properties: {
      name: (args.name as string) || 'Node',
    },
  };

  // Dimensions
  if (args.width != null) spec.properties.width = args.width as number;
  if (args.height != null) spec.properties.height = args.height as number;
  if (args.opacity != null) spec.properties.opacity = args.opacity as number;
  if (args.cornerRadius != null) spec.properties.cornerRadius = args.cornerRadius as number;
  if (args.clipsContent != null) spec.properties.clipsContent = args.clipsContent as boolean;

  // Fills
  if (nodeType === 'TEXT') {
    spec.properties.fills = args.textColor
      ? [{ type: 'SOLID' as const, color: args.textColor as { r: number; g: number; b: number } }]
      : [{ type: 'SOLID' as const, color: { r: 0, g: 0, b: 0 } }];
  } else if (args.fillColor) {
    spec.properties.fills = [{ type: 'SOLID' as const, color: args.fillColor as { r: number; g: number; b: number } }];
  }

  // Strokes
  if (args.strokeColor) {
    spec.properties.strokes = [{ type: 'SOLID' as const, color: args.strokeColor as { r: number; g: number; b: number } }];
    if (args.strokeWeight != null) spec.properties.strokeWeight = args.strokeWeight as number;
  }

  // Effects
  if (args.effects && Array.isArray(args.effects)) {
    spec.properties.effects = (args.effects as Record<string, unknown>[]).map(e => ({
      type: ((e.type as string) || 'DROP_SHADOW') as 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR',
      color: e.color as { r: number; g: number; b: number; a?: number } | undefined,
      offset: (e.offset as { x: number; y: number }) || { x: 0, y: 4 },
      radius: (e.radius as number) || 4,
      spread: (e.spread as number) || 0,
    }));
  }

  // Text properties (for TEXT nodes only)
  if (nodeType === 'TEXT') {
    spec.properties.text = {
      characters: (args.characters as string) || 'Text',
      style: {
        fontFamily: (args.fontFamily as string) || 'Inter',
        fontStyle: (args.fontStyle as string) || 'Regular',
        fontSize: (args.fontSize as number) || 14,
        textAlignHorizontal: args.textAlignHorizontal as 'LEFT' | 'CENTER' | 'RIGHT' | undefined,
      },
    };
  }

  // Layout (for FRAME / COMPONENT containers)
  if (nodeType === 'FRAME' || nodeType === 'COMPONENT') {
    spec.properties.layout = {
      layoutMode: (args.layoutMode as 'HORIZONTAL' | 'VERTICAL' | 'NONE') || 'VERTICAL',
      itemSpacing: args.itemSpacing as number | undefined,
      paddingTop: args.paddingTop as number | undefined,
      paddingRight: args.paddingRight as number | undefined,
      paddingBottom: args.paddingBottom as number | undefined,
      paddingLeft: args.paddingLeft as number | undefined,
      primaryAxisAlignItems: args.primaryAxisAlignItems as 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN' | undefined,
      counterAxisAlignItems: args.counterAxisAlignItems as 'MIN' | 'CENTER' | 'MAX' | undefined,
      primaryAxisSizingMode: (args.primaryAxisSizingMode as 'FIXED' | 'AUTO') || 'AUTO',
      counterAxisSizingMode: (args.counterAxisSizingMode as 'FIXED' | 'AUTO') || 'AUTO',
      layoutSizingHorizontal: args.layoutSizingHorizontal as 'FIXED' | 'HUG' | 'FILL' | undefined,
      layoutSizingVertical: args.layoutSizingVertical as 'FIXED' | 'HUG' | 'FILL' | undefined,
    };
  }

  // Layout sizing for non-container nodes (TEXT, RECTANGLE, ELLIPSE inside auto-layout parents)
  if (nodeType !== 'FRAME' && nodeType !== 'COMPONENT') {
    if (args.layoutSizingHorizontal || args.layoutSizingVertical) {
      spec.properties.layout = {
        layoutSizingHorizontal: args.layoutSizingHorizontal as 'FIXED' | 'HUG' | 'FILL' | undefined,
        layoutSizingVertical: args.layoutSizingVertical as 'FIXED' | 'HUG' | 'FILL' | undefined,
      };
    }
  }

  // Recurse into children
  if (args.children && Array.isArray(args.children) && (args.children as unknown[]).length > 0) {
    spec.children = (args.children as Record<string, unknown>[]).map(child => argsToNodeSpec(child));
  }

  // Button shortcut: FRAME with characters but no explicit children
  // Auto-creates a centered text label child node
  if (nodeType === 'FRAME' && args.characters && (!spec.children || spec.children.length === 0)) {
    spec.children = [{
      type: 'TEXT' as NodeType,
      properties: {
        name: 'Label',
        fills: args.textColor
          ? [{ type: 'SOLID' as const, color: args.textColor as { r: number; g: number; b: number } }]
          : [{ type: 'SOLID' as const, color: { r: 0, g: 0, b: 0 } }],
        text: {
          characters: args.characters as string,
          style: {
            fontFamily: (args.fontFamily as string) || 'Inter',
            fontStyle: (args.fontStyle as string) || 'Medium',
            fontSize: (args.fontSize as number) || 16,
            textAlignHorizontal: (args.textAlignHorizontal as 'LEFT' | 'CENTER' | 'RIGHT') || undefined,
          },
        },
      },
    }];
  }

  return spec;
}
