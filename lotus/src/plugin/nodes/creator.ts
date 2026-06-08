import type {
  SerializedNodeCreate,
  SerializedNodeProperties,
  SerializedPaint,
  SerializedEffect,
  SerializedColor,
} from '../types';

const loadedFonts = new Set<string>();

async function ensureFont(family: string, style: string): Promise<{ family: string; style: string }> {
  const key = `${family}::${style}`;
  if (loadedFonts.has(key)) return { family, style };
  try {
    await figma.loadFontAsync({ family, style });
    loadedFonts.add(key);
    return { family, style };
  } catch {
    // Font unavailable -- try fallback to Regular style of the same family
    if (style !== 'Regular') {
      const fallbackKey = `${family}::Regular`;
      if (!loadedFonts.has(fallbackKey)) {
        try {
          await figma.loadFontAsync({ family, style: 'Regular' });
          loadedFonts.add(fallbackKey);
          return { family, style: 'Regular' };
        } catch { /* family itself unavailable */ }
      } else {
        return { family, style: 'Regular' };
      }
    }
    // Last resort: Inter Regular
    const safeKey = 'Inter::Regular';
    if (!loadedFonts.has(safeKey)) {
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
      loadedFonts.add(safeKey);
    }
    return { family: 'Inter', style: 'Regular' };
  }
}

export async function createNodeFromSpec(
  spec: SerializedNodeCreate,
  parent?: FrameNode | GroupNode | ComponentNode | PageNode
): Promise<SceneNode | null> {
  let node: SceneNode;

  switch (spec.type) {
    case 'FRAME': {
      node = figma.createFrame();
      break;
    }
    case 'RECTANGLE': {
      node = figma.createRectangle();
      break;
    }
    case 'ELLIPSE': {
      node = figma.createEllipse();
      break;
    }
    case 'TEXT': {
      const textNode = figma.createText();
      const reqFamily = spec.properties.text?.style.fontFamily ?? 'Inter';
      const reqStyle = spec.properties.text?.style.fontStyle ?? 'Regular';
      const resolved = await ensureFont(reqFamily, reqStyle);
      textNode.fontName = { family: resolved.family, style: resolved.style };

      if (spec.properties.text?.characters) {
        textNode.characters = spec.properties.text.characters;
      }
      if (spec.properties.text?.style.fontSize) {
        textNode.fontSize = spec.properties.text.style.fontSize;
      }
      if (spec.properties.text?.style.lineHeight !== undefined) {
        const lh = spec.properties.text.style.lineHeight;
        if (lh === 'AUTO') {
          textNode.lineHeight = { unit: 'AUTO' };
        } else if (typeof lh === 'number') {
          textNode.lineHeight = { unit: 'PIXELS', value: lh };
        }
      }
      if (spec.properties.text?.style.letterSpacing !== undefined) {
        textNode.letterSpacing = {
          unit: 'PIXELS',
          value: spec.properties.text.style.letterSpacing,
        };
      }
      if (spec.properties.text?.style.textAlignHorizontal) {
        textNode.textAlignHorizontal = spec.properties.text.style.textAlignHorizontal;
      }
      if (spec.properties.text?.style.textAlignVertical) {
        textNode.textAlignVertical = spec.properties.text.style.textAlignVertical;
      }
      node = textNode;
      break;
    }
    case 'LINE': {
      node = figma.createLine();
      break;
    }
    case 'VECTOR': {
      node = figma.createVector();
      break;
    }
    case 'COMPONENT': {
      node = figma.createComponent();
      break;
    }
    case 'STAR': {
      node = figma.createStar();
      break;
    }
    case 'POLYGON': {
      node = figma.createPolygon();
      break;
    }
    default: {
      node = figma.createFrame();
      break;
    }
  }

  applyBaseProperties(node, spec.properties);

  // Append to parent
  const target = parent ?? figma.currentPage;
  target.appendChild(node);

  // Layout sizing must be set AFTER appending to an auto-layout parent
  applyLayoutSizing(node, spec.properties);

  // Position relative to viewport center if no explicit position
  if (spec.properties.x === undefined && spec.properties.y === undefined && !parent) {
    const center = figma.viewport.center;
    node.x = center.x - node.width / 2;
    node.y = center.y - node.height / 2;
  }

  // Create children recursively
  if (spec.children && 'children' in node) {
    const containerNode = node as FrameNode | ComponentNode;
    for (const childSpec of spec.children) {
      await createNodeFromSpec(childSpec, containerNode);
    }
  }

  return node;
}

export async function batchCreateNodes(
  specs: SerializedNodeCreate[],
  parent?: FrameNode | GroupNode | ComponentNode
): Promise<SceneNode[]> {
  const created: SceneNode[] = [];
  for (const spec of specs) {
    const node = await createNodeFromSpec(spec, parent);
    if (node) created.push(node);
  }
  return created;
}

function applyBaseProperties(node: SceneNode, props: SerializedNodeProperties): void {
  if (props.name !== undefined) node.name = props.name;

  if ('x' in node && props.x !== undefined) (node as FrameNode).x = props.x;
  if ('y' in node && props.y !== undefined) (node as FrameNode).y = props.y;

  if ('resize' in node) {
    const w = props.width ?? (node as FrameNode).width;
    const h = props.height ?? (node as FrameNode).height;
    if (w > 0 && h > 0) {
      (node as FrameNode).resize(w, h);
    }
  }

  if ('opacity' in node && props.opacity !== undefined) {
    (node as FrameNode).opacity = props.opacity;
  }

  if (props.visible !== undefined) node.visible = props.visible;
  if (props.locked !== undefined) node.locked = props.locked;

  if ('rotation' in node && props.rotation !== undefined) {
    (node as FrameNode).rotation = props.rotation;
  }

  if ('fills' in node && props.fills) {
    (node as GeometryMixin).fills = deserializePaints(props.fills);
  }

  if ('strokes' in node && props.strokes) {
    (node as GeometryMixin).strokes = deserializePaints(props.strokes);
    if (props.strokeWeight !== undefined) {
      (node as GeometryMixin).strokeWeight = props.strokeWeight;
    }
    if (props.strokeAlign !== undefined && 'strokeAlign' in node) {
      (node as RectangleNode).strokeAlign = props.strokeAlign;
    }
  }

  if ('cornerRadius' in node && props.cornerRadius !== undefined) {
    (node as RectangleNode).cornerRadius = props.cornerRadius;
  }
  if ('topLeftRadius' in node) {
    const rn = node as RectangleNode;
    if (props.topLeftRadius !== undefined) rn.topLeftRadius = props.topLeftRadius;
    if (props.topRightRadius !== undefined) rn.topRightRadius = props.topRightRadius;
    if (props.bottomLeftRadius !== undefined) rn.bottomLeftRadius = props.bottomLeftRadius;
    if (props.bottomRightRadius !== undefined) rn.bottomRightRadius = props.bottomRightRadius;
  }

  if ('effects' in node && props.effects) {
    (node as FrameNode).effects = deserializeEffects(props.effects);
  }

  if ('blendMode' in node && props.blendMode) {
    (node as FrameNode).blendMode = props.blendMode as BlendMode;
  }

  if ('clipsContent' in node && props.clipsContent !== undefined) {
    (node as FrameNode).clipsContent = props.clipsContent;
  }

  // Auto-layout
  if ('layoutMode' in node && props.layout) {
    const frame = node as FrameNode;
    if (props.layout.layoutMode) frame.layoutMode = props.layout.layoutMode;
    if (props.layout.primaryAxisAlignItems) frame.primaryAxisAlignItems = props.layout.primaryAxisAlignItems;
    if (props.layout.counterAxisAlignItems) frame.counterAxisAlignItems = props.layout.counterAxisAlignItems;
    if (props.layout.primaryAxisSizingMode) frame.primaryAxisSizingMode = props.layout.primaryAxisSizingMode;
    if (props.layout.counterAxisSizingMode) frame.counterAxisSizingMode = props.layout.counterAxisSizingMode;
    if (props.layout.itemSpacing !== undefined) frame.itemSpacing = props.layout.itemSpacing;
    if (props.layout.paddingTop !== undefined) frame.paddingTop = props.layout.paddingTop;
    if (props.layout.paddingRight !== undefined) frame.paddingRight = props.layout.paddingRight;
    if (props.layout.paddingBottom !== undefined) frame.paddingBottom = props.layout.paddingBottom;
    if (props.layout.paddingLeft !== undefined) frame.paddingLeft = props.layout.paddingLeft;
  }
}

function applyLayoutSizing(node: SceneNode, props: SerializedNodeProperties): void {
  if (!props.layout) return;
  const { layoutSizingHorizontal, layoutSizingVertical } = props.layout;

  // FILL/HUG only work inside an auto-layout parent. Setting them on a node
  // parented to the page or a non-auto-layout frame throws a fatal error.
  const parent = node.parent;
  const parentIsAutoLayout = parent &&
    'layoutMode' in parent &&
    (parent as FrameNode).layoutMode !== 'NONE';

  if (layoutSizingHorizontal && 'layoutSizingHorizontal' in node) {
    if (layoutSizingHorizontal === 'FILL' && !parentIsAutoLayout) {
      // Skip -- would throw "FILL can only be set on children of auto-layout frames"
    } else {
      try {
        (node as FrameNode).layoutSizingHorizontal = layoutSizingHorizontal;
      } catch { /* non-fatal: parent context mismatch */ }
    }
  }
  if (layoutSizingVertical && 'layoutSizingVertical' in node) {
    if (layoutSizingVertical === 'FILL' && !parentIsAutoLayout) {
      // Skip
    } else {
      try {
        (node as FrameNode).layoutSizingVertical = layoutSizingVertical;
      } catch { /* non-fatal: parent context mismatch */ }
    }
  }
}

function toFigmaColor(c: SerializedColor): RGB {
  return { r: c.r, g: c.g, b: c.b };
}

function deserializePaints(paints: SerializedPaint[]): Paint[] {
  return paints.map(p => {
    if (p.type === 'SOLID') {
      return {
        type: 'SOLID',
        color: toFigmaColor(p.color),
        opacity: p.opacity ?? 1,
        visible: p.visible ?? true,
      } as SolidPaint;
    }
    // Gradient paints
    if ('gradientStops' in p) {
      return {
        type: p.type,
        gradientStops: p.gradientStops.map(s => ({
          position: s.position,
          color: { ...toFigmaColor(s.color), a: s.color.a ?? 1 },
        })),
        gradientTransform: [[1, 0, 0], [0, 1, 0]], // Identity transform
        opacity: p.opacity ?? 1,
        visible: p.visible ?? true,
      } as GradientPaint;
    }
    return { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true } as SolidPaint;
  });
}

function deserializeEffects(effects: SerializedEffect[]): Effect[] {
  return effects.map(e => {
    if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
      return {
        type: e.type,
        color: e.color ? { ...e.color, a: e.color.a ?? 0.25 } : { r: 0, g: 0, b: 0, a: 0.25 },
        offset: e.offset ?? { x: 0, y: 4 },
        radius: e.radius,
        spread: e.spread ?? 0,
        visible: e.visible ?? true,
        blendMode: 'NORMAL' as BlendMode,
      } as DropShadowEffect;
    }
    return {
      type: e.type,
      radius: e.radius,
      visible: e.visible ?? true,
    } as BlurEffect;
  });
}
