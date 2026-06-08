import { walkTree } from '../nodes/traversal';

export function exportCode(node: SceneNode): string {
  const componentName = sanitizeComponentName(node.name);
  const jsx = nodeToJsx(node, 1);
  const styles = collectInlineStyles(node);

  return `import React from 'react';

export function ${componentName}() {
  return (
${jsx}
  );
}
${styles ? `\nconst styles = ${styles};` : ''}`;
}

function nodeToJsx(node: SceneNode, indent: number): string {
  const pad = '  '.repeat(indent + 1);
  const tag = getHtmlTag(node);
  const styleStr = buildStyleObject(node);
  const className = buildTailwindClasses(node);
  const attrs: string[] = [];

  if (className) attrs.push(`className="${className}"`);
  if (styleStr && !className) attrs.push(`style={${styleStr}}`);

  const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

  // Text node
  if (node.type === 'TEXT') {
    const text = (node as TextNode).characters;
    return `${pad}<${tag}${attrStr}>${escapeJsx(text)}</${tag}>`;
  }

  // Leaf node (no children)
  if (!('children' in node) || (node as FrameNode).children.length === 0) {
    return `${pad}<${tag}${attrStr} />`;
  }

  // Container with children
  const children = (node as FrameNode).children
    .filter(c => (c as SceneNode).visible !== false)
    .map(c => nodeToJsx(c as SceneNode, indent + 1))
    .join('\n');

  return `${pad}<${tag}${attrStr}>\n${children}\n${pad}</${tag}>`;
}

function getHtmlTag(node: SceneNode): string {
  const name = node.name.toLowerCase();

  if (node.type === 'TEXT') return 'p';
  if (/button|btn/i.test(name)) return 'button';
  if (/input/i.test(name)) return 'input';
  if (/image|img|photo|avatar|icon/i.test(name)) return 'img';
  if (/header|nav/i.test(name)) return 'header';
  if (/footer/i.test(name)) return 'footer';
  if (/sidebar|aside/i.test(name)) return 'aside';
  if (/section/i.test(name)) return 'section';
  if (/list/i.test(name)) return 'ul';
  if (/link|anchor/i.test(name)) return 'a';
  if (/heading|title|h[1-6]/i.test(name)) {
    const match = name.match(/h([1-6])/i);
    return match ? `h${match[1]}` : 'h2';
  }

  return 'div';
}

function buildTailwindClasses(node: SceneNode): string {
  const classes: string[] = [];

  // Layout
  if ('layoutMode' in node) {
    const frame = node as FrameNode;
    if (frame.layoutMode === 'HORIZONTAL') {
      classes.push('flex', 'flex-row');
    } else if (frame.layoutMode === 'VERTICAL') {
      classes.push('flex', 'flex-col');
    }

    if (frame.layoutMode !== 'NONE') {
      // Spacing
      const gap = frame.itemSpacing;
      if (gap > 0) classes.push(mapToTailwindSpacing('gap', gap));

      // Padding
      const pt = frame.paddingTop;
      const pr = frame.paddingRight;
      const pb = frame.paddingBottom;
      const pl = frame.paddingLeft;

      if (pt === pr && pr === pb && pb === pl && pt > 0) {
        classes.push(mapToTailwindSpacing('p', pt));
      } else {
        if (pt > 0) classes.push(mapToTailwindSpacing('pt', pt));
        if (pr > 0) classes.push(mapToTailwindSpacing('pr', pr));
        if (pb > 0) classes.push(mapToTailwindSpacing('pb', pb));
        if (pl > 0) classes.push(mapToTailwindSpacing('pl', pl));
      }

      // Alignment
      switch (frame.primaryAxisAlignItems) {
        case 'CENTER': classes.push('justify-center'); break;
        case 'MAX': classes.push('justify-end'); break;
        case 'SPACE_BETWEEN': classes.push('justify-between'); break;
      }
      switch (frame.counterAxisAlignItems) {
        case 'CENTER': classes.push('items-center'); break;
        case 'MAX': classes.push('items-end'); break;
      }
    }
  }

  // Size
  if ('width' in node) {
    const n = node as FrameNode;
    classes.push(mapToTailwindSpacing('w', n.width));
    classes.push(mapToTailwindSpacing('h', n.height));
  }

  // Background color
  if ('fills' in node) {
    const fills = (node as GeometryMixin).fills;
    if (fills !== figma.mixed && Array.isArray(fills)) {
      const solid = fills.find(f => f.type === 'SOLID' && f.visible !== false) as SolidPaint | undefined;
      if (solid) {
        const hex = rgbToHex(solid.color.r, solid.color.g, solid.color.b);
        classes.push(`bg-[${hex}]`);
      }
    }
  }

  // Corner radius
  if ('cornerRadius' in node) {
    const cr = (node as RectangleNode).cornerRadius;
    if (typeof cr === 'number' && cr > 0) {
      classes.push(mapToTailwindRadius(cr));
    }
  }

  // Text styles
  if (node.type === 'TEXT') {
    const textNode = node as TextNode;
    const fontSize = textNode.fontSize;
    if (typeof fontSize === 'number') {
      classes.push(mapToTailwindFontSize(fontSize));
    }
    const fontName = textNode.fontName;
    if (fontName !== figma.mixed && /bold|semibold/i.test(fontName.style)) {
      classes.push('font-semibold');
    } else if (fontName !== figma.mixed && /medium/i.test(fontName.style)) {
      classes.push('font-medium');
    }

    // Text color
    const fills = textNode.fills;
    if (fills !== figma.mixed && Array.isArray(fills)) {
      const solid = fills.find(f => f.type === 'SOLID' && f.visible !== false) as SolidPaint | undefined;
      if (solid) {
        const hex = rgbToHex(solid.color.r, solid.color.g, solid.color.b);
        classes.push(`text-[${hex}]`);
      }
    }

    switch (textNode.textAlignHorizontal) {
      case 'CENTER': classes.push('text-center'); break;
      case 'RIGHT': classes.push('text-right'); break;
      case 'JUSTIFIED': classes.push('text-justify'); break;
    }
  }

  // Opacity
  if ('opacity' in node) {
    const op = (node as FrameNode).opacity;
    if (op < 1) {
      classes.push(`opacity-${Math.round(op * 100)}`);
    }
  }

  return classes.join(' ');
}

function buildStyleObject(node: SceneNode): string | null {
  // Used as fallback when Tailwind classes aren't sufficient
  return null;
}

function collectInlineStyles(_node: SceneNode): string | null {
  return null;
}

function mapToTailwindSpacing(prefix: string, value: number): string {
  // Map pixel values to Tailwind spacing scale
  const scale: Record<number, string> = {
    0: '0', 1: 'px', 2: '0.5', 4: '1', 6: '1.5', 8: '2',
    10: '2.5', 12: '3', 14: '3.5', 16: '4', 20: '5', 24: '6',
    28: '7', 32: '8', 36: '9', 40: '10', 44: '11', 48: '12',
    56: '14', 64: '16', 80: '20', 96: '24', 112: '28', 128: '32',
    144: '36', 160: '40', 176: '44', 192: '48', 208: '52',
    224: '56', 240: '60', 256: '64', 288: '72', 320: '80', 384: '96',
  };

  const closest = Object.keys(scale)
    .map(Number)
    .reduce((prev, curr) =>
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );

  return `${prefix}-${scale[closest] ?? `[${value}px]`}`;
}

function mapToTailwindRadius(value: number): string {
  if (value >= 9999) return 'rounded-full';
  if (value >= 16) return 'rounded-2xl';
  if (value >= 12) return 'rounded-xl';
  if (value >= 8) return 'rounded-lg';
  if (value >= 6) return 'rounded-md';
  if (value >= 4) return 'rounded';
  if (value >= 2) return 'rounded-sm';
  return `rounded-[${value}px]`;
}

function mapToTailwindFontSize(size: number): string {
  const scale: Record<number, string> = {
    10: 'text-[10px]', 11: 'text-xs', 12: 'text-sm', 14: 'text-sm',
    16: 'text-base', 18: 'text-lg', 20: 'text-xl', 24: 'text-2xl',
    30: 'text-3xl', 36: 'text-4xl', 48: 'text-5xl', 60: 'text-6xl',
    72: 'text-7xl', 96: 'text-8xl', 128: 'text-9xl',
  };
  const closest = Object.keys(scale)
    .map(Number)
    .reduce((prev, curr) =>
      Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev
    );
  return scale[closest] ?? `text-[${size}px]`;
}

function sanitizeComponentName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('') || 'Component';
}

function escapeJsx(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/{/g, '&#123;')
    .replace(/}/g, '&#125;');
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
