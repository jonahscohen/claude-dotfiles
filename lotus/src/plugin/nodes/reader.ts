import type {
  SerializedNode,
  SerializedNodeProperties,
  SerializedPaint,
  SerializedGradientPaint,
  SerializedEffect,
  SerializedLayoutProperties,
  SerializedTextStyle,
} from '../types';

export function readSelection(): SerializedNode[] {
  return figma.currentPage.selection.map(node => serializeNode(node, 2));
}

export function readNodeTree(root: BaseNode & ChildrenMixin, depth: number): SerializedNode[] {
  return root.children.map(child => serializeNode(child as SceneNode, depth));
}

export function serializeNode(node: SceneNode, depth: number): SerializedNode {
  const result: SerializedNode = {
    id: node.id,
    type: node.type,
    name: node.name,
    x: 'x' in node ? (node as FrameNode).x : 0,
    y: 'y' in node ? (node as FrameNode).y : 0,
    width: 'width' in node ? (node as FrameNode).width : 0,
    height: 'height' in node ? (node as FrameNode).height : 0,
    properties: readNodeProperties(node),
  };

  if (depth > 0 && 'children' in node) {
    const parent = node as FrameNode;
    result.children = parent.children.map(child =>
      serializeNode(child as SceneNode, depth - 1)
    );
  }

  return result;
}

function readNodeProperties(node: SceneNode): SerializedNodeProperties {
  const props: SerializedNodeProperties = {
    name: node.name,
    visible: node.visible,
    locked: node.locked,
    opacity: 'opacity' in node ? (node as FrameNode).opacity : 1,
  };

  if ('x' in node) {
    const n = node as FrameNode;
    props.x = n.x;
    props.y = n.y;
    props.width = n.width;
    props.height = n.height;
  }

  if ('rotation' in node) {
    props.rotation = (node as FrameNode).rotation;
  }

  if ('fills' in node) {
    const fills = (node as GeometryMixin).fills;
    if (fills !== figma.mixed && Array.isArray(fills)) {
      props.fills = serializePaints(fills as Paint[]);
    }
  }

  if ('strokes' in node) {
    const n = node as GeometryMixin;
    props.strokes = serializePaints(n.strokes as Paint[]);
    const sw = n.strokeWeight;
    if (typeof sw === 'number') {
      props.strokeWeight = sw;
    }
  }

  if ('cornerRadius' in node) {
    const cr = (node as RectangleNode).cornerRadius;
    if (typeof cr === 'number') {
      props.cornerRadius = cr;
    }
  }

  if ('effects' in node) {
    props.effects = serializeEffects((node as FrameNode).effects as readonly Effect[]);
  }

  if ('blendMode' in node) {
    props.blendMode = (node as FrameNode).blendMode;
  }

  if ('clipsContent' in node) {
    props.clipsContent = (node as FrameNode).clipsContent;
  }

  // Auto-layout
  if ('layoutMode' in node) {
    const frame = node as FrameNode;
    props.layout = readLayoutProperties(frame);
  }

  // Text
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    props.text = {
      characters: textNode.characters,
      style: readTextStyle(textNode),
    };
  }

  return props;
}

function readLayoutProperties(frame: FrameNode): SerializedLayoutProperties {
  return {
    layoutMode: frame.layoutMode,
    primaryAxisAlignItems: frame.primaryAxisAlignItems,
    counterAxisAlignItems: frame.counterAxisAlignItems,
    primaryAxisSizingMode: frame.primaryAxisSizingMode,
    counterAxisSizingMode: frame.counterAxisSizingMode,
    itemSpacing: frame.itemSpacing,
    paddingTop: frame.paddingTop,
    paddingRight: frame.paddingRight,
    paddingBottom: frame.paddingBottom,
    paddingLeft: frame.paddingLeft,
  };
}

function readTextStyle(textNode: TextNode): SerializedTextStyle {
  const fontName = textNode.fontName;
  const fontSize = textNode.fontSize;
  const lineHeight = textNode.lineHeight;

  return {
    fontFamily: fontName !== figma.mixed ? fontName.family : 'Inter',
    fontStyle: fontName !== figma.mixed ? fontName.style : 'Regular',
    fontSize: typeof fontSize === 'number' ? fontSize : 14,
    lineHeight: lineHeight !== figma.mixed && lineHeight.unit === 'PIXELS'
      ? lineHeight.value
      : 'AUTO',
    letterSpacing: (() => {
      const ls = textNode.letterSpacing;
      if (ls !== figma.mixed && ls.unit === 'PIXELS') return ls.value;
      return 0;
    })(),
    textAlignHorizontal: textNode.textAlignHorizontal,
    textAlignVertical: textNode.textAlignVertical,
  };
}

function serializePaints(paints: Paint[]): SerializedPaint[] {
  return paints
    .filter(p => p.visible !== false)
    .map(paint => {
      if (paint.type === 'SOLID') {
        return {
          type: 'SOLID' as const,
          color: { r: paint.color.r, g: paint.color.g, b: paint.color.b },
          opacity: paint.opacity,
        };
      }
      if (paint.type.startsWith('GRADIENT_')) {
        const gp = paint as GradientPaint;
        return {
          type: paint.type as SerializedGradientPaint['type'],
          gradientStops: gp.gradientStops.map(s => ({
            position: s.position,
            color: { r: s.color.r, g: s.color.g, b: s.color.b, a: s.color.a },
          })),
          opacity: paint.opacity,
        };
      }
      // Fallback for image fills etc - serialize as transparent
      return {
        type: 'SOLID' as const,
        color: { r: 0, g: 0, b: 0 },
        opacity: 0,
      };
    });
}

function serializeEffects(effects: readonly Effect[]): SerializedEffect[] {
  return effects
    .filter(e => e.visible !== false)
    .map(effect => {
      const base: SerializedEffect = {
        type: effect.type as SerializedEffect['type'],
        radius: 'radius' in effect ? effect.radius : 0,
        visible: effect.visible,
      };
      if ('color' in effect && effect.color) {
        base.color = {
          r: effect.color.r,
          g: effect.color.g,
          b: effect.color.b,
          a: effect.color.a,
        };
      }
      if ('offset' in effect && effect.offset) {
        base.offset = { x: effect.offset.x, y: effect.offset.y };
      }
      if ('spread' in effect) {
        base.spread = effect.spread;
      }
      return base;
    });
}
