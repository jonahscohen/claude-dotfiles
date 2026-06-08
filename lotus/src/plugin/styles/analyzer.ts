import { walkTree } from '../nodes/traversal';

export interface DesignPatterns {
  spacingScale: number[];
  colorPalette: string[];
  fontFamilies: string[];
  fontSizes: number[];
  borderRadii: number[];
}

export function analyzeDesignPatterns(root: SceneNode): DesignPatterns {
  const spacings = new Set<number>();
  const colors = new Set<string>();
  const fonts = new Set<string>();
  const fontSizes = new Set<number>();
  const radii = new Set<number>();

  walkTree(root, (node) => {
    // Collect spacing values from auto-layout frames
    if ('layoutMode' in node) {
      const frame = node as FrameNode;
      if (frame.layoutMode !== 'NONE') {
        spacings.add(frame.itemSpacing);
        spacings.add(frame.paddingTop);
        spacings.add(frame.paddingRight);
        spacings.add(frame.paddingBottom);
        spacings.add(frame.paddingLeft);
      }
    }

    // Collect colors from fills
    if ('fills' in node) {
      const fills = (node as GeometryMixin).fills;
      if (fills !== figma.mixed && Array.isArray(fills)) {
        for (const fill of fills) {
          if (fill.type === 'SOLID' && fill.visible !== false) {
            const c = fill.color;
            colors.add(rgbToHex(c.r, c.g, c.b));
          }
        }
      }
    }

    // Collect font info
    if (node.type === 'TEXT') {
      const textNode = node as TextNode;
      const fontName = textNode.fontName;
      if (fontName !== figma.mixed) {
        fonts.add(fontName.family);
      }
      const fontSize = textNode.fontSize;
      if (typeof fontSize === 'number') {
        fontSizes.add(fontSize);
      }
    }

    // Collect border radii
    if ('cornerRadius' in node) {
      const cr = (node as RectangleNode).cornerRadius;
      if (typeof cr === 'number' && cr > 0) {
        radii.add(cr);
      }
    }
  });

  return {
    spacingScale: [...spacings].filter(s => s > 0).sort((a, b) => a - b),
    colorPalette: [...colors].sort(),
    fontFamilies: [...fonts].sort(),
    fontSizes: [...fontSizes].sort((a, b) => a - b),
    borderRadii: [...radii].sort((a, b) => a - b),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
