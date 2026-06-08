export function exportSvelte(node: SceneNode): string {
  const template = nodeToMarkup(node, 0);
  const styles = collectStyles(node);

  return `<script lang="ts">
  // ${sanitizeName(node.name)} component
</script>

${template}

<style>
${styles}
</style>`;
}

function nodeToMarkup(node: SceneNode, indent: number): string {
  const pad = '  '.repeat(indent);
  const tag = getTag(node);
  const cls = buildClasses(node);
  const classAttr = cls ? ` class="${cls}"` : '';

  if (node.type === 'TEXT') {
    return `${pad}<${tag}${classAttr}>${(node as TextNode).characters}</${tag}>`;
  }

  if (!('children' in node) || (node as FrameNode).children.length === 0) {
    return `${pad}<${tag}${classAttr} />`;
  }

  const children = (node as FrameNode).children
    .filter(c => (c as SceneNode).visible !== false)
    .map(c => nodeToMarkup(c as SceneNode, indent + 1))
    .join('\n');

  return `${pad}<${tag}${classAttr}>\n${children}\n${pad}</${tag}>`;
}

function getTag(node: SceneNode): string {
  const name = node.name.toLowerCase();
  if (node.type === 'TEXT') return 'p';
  if (/button|btn/i.test(name)) return 'button';
  if (/input/i.test(name)) return 'input';
  return 'div';
}

function buildClasses(node: SceneNode): string {
  const classes: string[] = [];
  if ('layoutMode' in node) {
    const f = node as FrameNode;
    if (f.layoutMode === 'HORIZONTAL') classes.push('flex', 'row');
    else if (f.layoutMode === 'VERTICAL') classes.push('flex', 'col');
  }
  return classes.join(' ');
}

function collectStyles(node: SceneNode): string {
  // Generate scoped CSS from node properties
  const rules: string[] = [];

  if ('fills' in node) {
    const fills = (node as GeometryMixin).fills;
    if (fills !== figma.mixed && Array.isArray(fills)) {
      const solid = fills.find(f => f.type === 'SOLID' && f.visible !== false) as SolidPaint | undefined;
      if (solid) {
        const hex = rgbToHex(solid.color.r, solid.color.g, solid.color.b);
        rules.push(`  background-color: ${hex};`);
      }
    }
  }

  return rules.length > 0 ? rules.join('\n') : '  /* styles */';
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '') || 'Component';
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
