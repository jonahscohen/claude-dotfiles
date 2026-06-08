import type { SerializedNodeProperties } from '../types';

const loadedFonts = new Set<string>();

async function ensureFont(family: string, style: string): Promise<void> {
  const key = `${family}::${style}`;
  if (loadedFonts.has(key)) return;
  await figma.loadFontAsync({ family, style });
  loadedFonts.add(key);
}

export async function modifyNode(
  node: SceneNode,
  properties: Partial<SerializedNodeProperties>
): Promise<void> {
  // For TEXT nodes, preemptively load the current font before any property
  // changes. Figma requires font loading for fills, characters, fontSize,
  // alignment -- essentially everything on a text node.
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    const currentFont = textNode.fontName;
    if (currentFont === figma.mixed) {
      const len = textNode.characters.length;
      const loaded = new Set<string>();
      for (let i = 0; i < len; i++) {
        const f = textNode.getRangeFontName(i, i + 1) as FontName;
        const key = `${f.family}::${f.style}`;
        if (!loaded.has(key)) {
          await ensureFont(f.family, f.style);
          loaded.add(key);
        }
      }
    } else {
      await ensureFont(currentFont.family, currentFont.style);
    }
  }

  if (properties.name !== undefined) node.name = properties.name;
  if (properties.visible !== undefined) node.visible = properties.visible;
  if (properties.locked !== undefined) node.locked = properties.locked;

  if ('opacity' in node && properties.opacity !== undefined) {
    (node as FrameNode).opacity = properties.opacity;
  }

  if ('x' in node && properties.x !== undefined) (node as FrameNode).x = properties.x;
  if ('y' in node && properties.y !== undefined) (node as FrameNode).y = properties.y;

  if ('resize' in node) {
    const w = properties.width;
    const h = properties.height;
    if (w !== undefined || h !== undefined) {
      const currentW = (node as FrameNode).width;
      const currentH = (node as FrameNode).height;
      (node as FrameNode).resize(w ?? currentW, h ?? currentH);
    }
  }

  if ('rotation' in node && properties.rotation !== undefined) {
    (node as FrameNode).rotation = properties.rotation;
  }

  // ── Fills ────────────────────────────────────────────────────────────────
  if ('fills' in node && properties.fills !== undefined) {
    // Empty array = remove all fills (transparent background)
    if (properties.fills.length === 0) {
      (node as GeometryMixin).fills = [];
    } else {
      const paints: SolidPaint[] = properties.fills.map(f => {
        if (f.type === 'SOLID') {
          return {
            type: 'SOLID' as const,
            color: { r: f.color.r, g: f.color.g, b: f.color.b },
            opacity: f.opacity ?? 1,
            visible: f.visible ?? true,
          };
        }
        return { type: 'SOLID' as const, color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true };
      });
      (node as GeometryMixin).fills = paints;
    }
  }

  // ── Strokes ──────────────────────────────────────────────────────────────
  if ('strokes' in node && properties.strokes !== undefined) {
    if (properties.strokes.length === 0) {
      (node as GeometryMixin).strokes = [];
    } else {
      const paints: SolidPaint[] = properties.strokes.map(s => {
        if (s.type === 'SOLID') {
          return {
            type: 'SOLID' as const,
            color: { r: s.color.r, g: s.color.g, b: s.color.b },
            opacity: s.opacity ?? 1,
            visible: s.visible ?? true,
          };
        }
        return { type: 'SOLID' as const, color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true };
      });
      (node as GeometryMixin).strokes = paints;
    }
  }
  if ('strokes' in node && properties.strokeWeight !== undefined) {
    (node as GeometryMixin).strokeWeight = properties.strokeWeight;
  }
  if ('strokeAlign' in node && properties.strokeAlign !== undefined) {
    (node as RectangleNode).strokeAlign = properties.strokeAlign;
  }

  // ── Corner radius ───────────────────────────────────────────────────────
  if ('cornerRadius' in node && properties.cornerRadius !== undefined) {
    (node as RectangleNode).cornerRadius = properties.cornerRadius;
  }

  // ── Clips content ───────────────────────────────────────────────────────
  if ('clipsContent' in node && properties.clipsContent !== undefined) {
    (node as FrameNode).clipsContent = properties.clipsContent;
  }

  // ── Effects ─────────────────────────────────────────────────────────────
  if ('effects' in node && properties.effects !== undefined) {
    if (properties.effects.length === 0) {
      (node as FrameNode).effects = [];
    } else {
      (node as FrameNode).effects = properties.effects.map(e => {
        if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
          return {
            type: e.type,
            color: e.color ? { r: e.color.r, g: e.color.g, b: e.color.b, a: e.color.a ?? 0.25 } : { r: 0, g: 0, b: 0, a: 0.25 },
            offset: e.offset ?? { x: 0, y: 4 },
            radius: e.radius,
            spread: e.spread ?? 0,
            visible: e.visible ?? true,
            blendMode: 'NORMAL' as BlendMode,
          } as DropShadowEffect;
        }
        return { type: e.type, radius: e.radius, visible: e.visible ?? true } as BlurEffect;
      });
    }
  }

  // ── Auto-layout properties ──────────────────────────────────────────────
  if ('layoutMode' in node && properties.layout) {
    const frame = node as FrameNode;
    const layout = properties.layout;
    if (layout.layoutMode) frame.layoutMode = layout.layoutMode;
    if (layout.primaryAxisAlignItems) frame.primaryAxisAlignItems = layout.primaryAxisAlignItems;
    if (layout.counterAxisAlignItems) frame.counterAxisAlignItems = layout.counterAxisAlignItems;
    if (layout.primaryAxisSizingMode) frame.primaryAxisSizingMode = layout.primaryAxisSizingMode;
    if (layout.counterAxisSizingMode) frame.counterAxisSizingMode = layout.counterAxisSizingMode;
    if (layout.itemSpacing !== undefined) frame.itemSpacing = layout.itemSpacing;
    if (layout.paddingTop !== undefined) frame.paddingTop = layout.paddingTop;
    if (layout.paddingRight !== undefined) frame.paddingRight = layout.paddingRight;
    if (layout.paddingBottom !== undefined) frame.paddingBottom = layout.paddingBottom;
    if (layout.paddingLeft !== undefined) frame.paddingLeft = layout.paddingLeft;
  }

  // ── Layout sizing (works on any node inside an auto-layout parent) ─────
  if (properties.layout) {
    if (properties.layout.layoutSizingHorizontal && 'layoutSizingHorizontal' in node) {
      (node as FrameNode).layoutSizingHorizontal = properties.layout.layoutSizingHorizontal;
    }
    if (properties.layout.layoutSizingVertical && 'layoutSizingVertical' in node) {
      (node as FrameNode).layoutSizingVertical = properties.layout.layoutSizingVertical;
    }
  }

  // ── Text properties ─────────────────────────────────────────────────────
  // Note: Current font was already loaded at the top of modifyNode for TEXT nodes.
  if (node.type === 'TEXT' && properties.text) {
    const textNode = node as TextNode;
    const style = properties.text.style;

    // Only override the font if the AI EXPLICITLY requested a different one
    if (style.fontFamily && style.fontStyle) {
      await ensureFont(style.fontFamily, style.fontStyle);
      textNode.fontName = { family: style.fontFamily, style: style.fontStyle };
    }

    if (properties.text.characters !== undefined) {
      textNode.characters = properties.text.characters;
    }
    if (style.fontSize !== undefined) textNode.fontSize = style.fontSize;
    if (style.textAlignHorizontal) textNode.textAlignHorizontal = style.textAlignHorizontal;
    if (style.textAlignVertical) textNode.textAlignVertical = style.textAlignVertical;
    if (style.lineHeight !== undefined) {
      textNode.lineHeight = style.lineHeight === 'AUTO'
        ? { unit: 'AUTO' }
        : { unit: 'PIXELS', value: style.lineHeight };
    }
    if (style.letterSpacing !== undefined) {
      textNode.letterSpacing = { unit: 'PIXELS', value: style.letterSpacing };
    }
  }
}
