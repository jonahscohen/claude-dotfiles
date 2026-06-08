export function exportHtmlTailwind(node: SceneNode): string {
  const markup = nodeToHtml(node, 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${node.name}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
</head>
<body>
${markup}
</body>
</html>`;
}

function nodeToHtml(node: SceneNode, indent: number): string {
  const pad = '  '.repeat(indent + 1);
  const tag = getTag(node);
  const cls = buildTailwind(node);
  const classAttr = cls ? ` class="${cls}"` : '';

  if (node.type === 'TEXT') {
    return `${pad}<${tag}${classAttr}>${escapeHtml((node as TextNode).characters)}</${tag}>`;
  }

  if (!('children' in node) || (node as FrameNode).children.length === 0) {
    const selfClosing = ['img', 'input', 'br', 'hr'].includes(tag);
    return selfClosing
      ? `${pad}<${tag}${classAttr} />`
      : `${pad}<${tag}${classAttr}></${tag}>`;
  }

  const children = (node as FrameNode).children
    .filter(c => (c as SceneNode).visible !== false)
    .map(c => nodeToHtml(c as SceneNode, indent + 1))
    .join('\n');

  return `${pad}<${tag}${classAttr}>\n${children}\n${pad}</${tag}>`;
}

function getTag(node: SceneNode): string {
  const name = node.name.toLowerCase();
  if (node.type === 'TEXT') {
    if (/heading|title|h1/i.test(name)) return 'h1';
    if (/h2/i.test(name)) return 'h2';
    if (/h3/i.test(name)) return 'h3';
    return 'p';
  }
  if (/button|btn/i.test(name)) return 'button';
  if (/input/i.test(name)) return 'input';
  if (/image|img/i.test(name)) return 'img';
  if (/nav/i.test(name)) return 'nav';
  if (/header/i.test(name)) return 'header';
  if (/footer/i.test(name)) return 'footer';
  if (/main/i.test(name)) return 'main';
  if (/section/i.test(name)) return 'section';
  if (/aside|sidebar/i.test(name)) return 'aside';
  return 'div';
}

function buildTailwind(node: SceneNode): string {
  const classes: string[] = [];

  // Layout
  if ('layoutMode' in node) {
    const f = node as FrameNode;
    if (f.layoutMode === 'HORIZONTAL') classes.push('flex', 'flex-row');
    else if (f.layoutMode === 'VERTICAL') classes.push('flex', 'flex-col');

    if (f.layoutMode !== 'NONE') {
      if (f.itemSpacing > 0) classes.push(`gap-[${f.itemSpacing}px]`);

      const pt = f.paddingTop, pr = f.paddingRight, pb = f.paddingBottom, pl = f.paddingLeft;
      if (pt === pr && pr === pb && pb === pl && pt > 0) {
        classes.push(`p-[${pt}px]`);
      } else {
        if (pt > 0) classes.push(`pt-[${pt}px]`);
        if (pr > 0) classes.push(`pr-[${pr}px]`);
        if (pb > 0) classes.push(`pb-[${pb}px]`);
        if (pl > 0) classes.push(`pl-[${pl}px]`);
      }

      switch (f.primaryAxisAlignItems) {
        case 'CENTER': classes.push('justify-center'); break;
        case 'MAX': classes.push('justify-end'); break;
        case 'SPACE_BETWEEN': classes.push('justify-between'); break;
      }
      switch (f.counterAxisAlignItems) {
        case 'CENTER': classes.push('items-center'); break;
        case 'MAX': classes.push('items-end'); break;
      }
    }
  }

  // Dimensions
  if ('width' in node) {
    const n = node as FrameNode;
    classes.push(`w-[${Math.round(n.width)}px]`);
    classes.push(`h-[${Math.round(n.height)}px]`);
  }

  // Background
  if ('fills' in node && node.type !== 'TEXT') {
    const fills = (node as GeometryMixin).fills;
    if (fills !== figma.mixed && Array.isArray(fills)) {
      const solid = fills.find(f => f.type === 'SOLID' && f.visible !== false) as SolidPaint | undefined;
      if (solid) {
        classes.push(`bg-[${rgbToHex(solid.color.r, solid.color.g, solid.color.b)}]`);
      }
    }
  }

  // Text color
  if (node.type === 'TEXT') {
    const fills = (node as TextNode).fills;
    if (fills !== figma.mixed && Array.isArray(fills)) {
      const solid = fills.find(f => f.type === 'SOLID' && f.visible !== false) as SolidPaint | undefined;
      if (solid) {
        classes.push(`text-[${rgbToHex(solid.color.r, solid.color.g, solid.color.b)}]`);
      }
    }
    const fontSize = (node as TextNode).fontSize;
    if (typeof fontSize === 'number') {
      classes.push(`text-[${fontSize}px]`);
    }
    const fontName = (node as TextNode).fontName;
    if (fontName !== figma.mixed) {
      if (/bold/i.test(fontName.style)) classes.push('font-bold');
      else if (/semibold/i.test(fontName.style)) classes.push('font-semibold');
      else if (/medium/i.test(fontName.style)) classes.push('font-medium');
    }
  }

  // Border radius
  if ('cornerRadius' in node) {
    const cr = (node as RectangleNode).cornerRadius;
    if (typeof cr === 'number' && cr > 0) {
      if (cr >= 9999) classes.push('rounded-full');
      else classes.push(`rounded-[${cr}px]`);
    }
  }

  // Opacity
  if ('opacity' in node) {
    const op = (node as FrameNode).opacity;
    if (op < 1) classes.push(`opacity-[${op}]`);
  }

  // Effects (shadows)
  if ('effects' in node) {
    const effects = (node as FrameNode).effects as readonly Effect[];
    const shadow = effects.find(e => e.type === 'DROP_SHADOW' && e.visible !== false);
    if (shadow) classes.push('shadow-lg');
  }

  return classes.join(' ');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
