export function applyStyleTransfer(source: SceneNode, targets: SceneNode[]): void {
  for (const target of targets) {
    // Fills
    if ('fills' in source && 'fills' in target) {
      const fills = (source as GeometryMixin).fills;
      if (fills !== figma.mixed) {
        (target as GeometryMixin).fills = JSON.parse(JSON.stringify(fills));
      }
    }

    // Strokes
    if ('strokes' in source && 'strokes' in target) {
      (target as GeometryMixin).strokes = JSON.parse(
        JSON.stringify((source as GeometryMixin).strokes)
      );
      const sw = (source as GeometryMixin).strokeWeight;
      if (typeof sw === 'number') {
        (target as GeometryMixin).strokeWeight = sw;
      }
    }

    // Corner radius
    if ('cornerRadius' in source && 'cornerRadius' in target) {
      const cr = (source as RectangleNode).cornerRadius;
      if (typeof cr === 'number') {
        (target as RectangleNode).cornerRadius = cr;
      } else {
        // Individual corner radii
        const src = source as RectangleNode;
        const tgt = target as RectangleNode;
        tgt.topLeftRadius = src.topLeftRadius;
        tgt.topRightRadius = src.topRightRadius;
        tgt.bottomLeftRadius = src.bottomLeftRadius;
        tgt.bottomRightRadius = src.bottomRightRadius;
      }
    }

    // Effects
    if ('effects' in source && 'effects' in target) {
      (target as FrameNode).effects = JSON.parse(
        JSON.stringify((source as FrameNode).effects)
      );
    }

    // Opacity
    if ('opacity' in source && 'opacity' in target) {
      (target as FrameNode).opacity = (source as FrameNode).opacity;
    }

    // Blend mode
    if ('blendMode' in source && 'blendMode' in target) {
      (target as FrameNode).blendMode = (source as FrameNode).blendMode;
    }

    // Layout properties (auto-layout)
    if ('layoutMode' in source && 'layoutMode' in target) {
      const src = source as FrameNode;
      const tgt = target as FrameNode;
      tgt.layoutMode = src.layoutMode;
      if (src.layoutMode !== 'NONE') {
        tgt.primaryAxisAlignItems = src.primaryAxisAlignItems;
        tgt.counterAxisAlignItems = src.counterAxisAlignItems;
        tgt.primaryAxisSizingMode = src.primaryAxisSizingMode;
        tgt.counterAxisSizingMode = src.counterAxisSizingMode;
        tgt.itemSpacing = src.itemSpacing;
        tgt.paddingTop = src.paddingTop;
        tgt.paddingRight = src.paddingRight;
        tgt.paddingBottom = src.paddingBottom;
        tgt.paddingLeft = src.paddingLeft;
      }
    }

    // Text style transfer
    if (source.type === 'TEXT' && target.type === 'TEXT') {
      transferTextStyles(source as TextNode, target as TextNode);
    }
  }
}

async function transferTextStyles(source: TextNode, target: TextNode): Promise<void> {
  const fontName = source.fontName;
  if (fontName !== figma.mixed) {
    await figma.loadFontAsync(fontName);
    target.fontName = fontName;
  }
  const fontSize = source.fontSize;
  if (typeof fontSize === 'number') {
    target.fontSize = fontSize;
  }
  target.textAlignHorizontal = source.textAlignHorizontal;
  target.textAlignVertical = source.textAlignVertical;
  const lineHeight = source.lineHeight;
  if (lineHeight !== figma.mixed) {
    target.lineHeight = lineHeight;
  }
  const letterSpacing = source.letterSpacing;
  if (letterSpacing !== figma.mixed) {
    target.letterSpacing = letterSpacing;
  }
}
