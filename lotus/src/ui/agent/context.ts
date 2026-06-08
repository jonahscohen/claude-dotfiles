import type { PluginBridge } from '../hooks/usePlugin';
import type { AppMode } from '../App';
import type { SerializedNode, DesignSystemContext } from '../../plugin/types';

interface ContextData {
  designSystem?: string;
  selection?: string;
  pageContext?: string;
}

export async function buildContext(
  plugin: PluginBridge,
  mode: AppMode,
  selection: SerializedNode[]
): Promise<ContextData> {
  const result: ContextData = {};

  // Always include selection if available
  if (selection.length > 0) {
    result.selection = summarizeSelection(selection);
  }

  // Include design system for modes that benefit from it
  if (['generate', 'modify', 'style-transfer', 'components', 'critique'].includes(mode)) {
    try {
      const ds = await plugin.request<DesignSystemContext>(rid => ({
        type: 'get-design-system' as const,
        requestId: rid,
      }));
      result.designSystem = summarizeDesignSystem(ds);
    } catch {
      // Design system extraction is optional
    }
  }

  return result;
}

function summarizeSelection(selection: SerializedNode[]): string {
  if (selection.length === 0) return 'No nodes selected.';

  return selection.map(node => summarizeNode(node, 0)).join('\n');
}

function summarizeNode(node: SerializedNode, depth: number): string {
  const indent = '  '.repeat(depth);
  const props: string[] = [`${node.type} "${node.name}" (id:${node.id})`];

  props.push(`${Math.round(node.width)}x${Math.round(node.height)} at (${Math.round(node.x)}, ${Math.round(node.y)})`);

  if (node.properties.fills?.length) {
    const fill = node.properties.fills[0];
    if (fill.type === 'SOLID') {
      const c = fill.color;
      props.push(`fill: rgb(${r01(c.r)},${r01(c.g)},${r01(c.b)})`);
    }
  }

  if (node.properties.layout?.layoutMode && node.properties.layout.layoutMode !== 'NONE') {
    props.push(`layout: ${node.properties.layout.layoutMode} gap=${node.properties.layout.itemSpacing ?? 0}`);
  }

  if (node.properties.text) {
    const text = node.properties.text.characters;
    const truncated = text.length > 50 ? text.slice(0, 50) + '...' : text;
    props.push(`text: "${truncated}" ${node.properties.text.style.fontSize}px ${node.properties.text.style.fontFamily}`);
  }

  if (node.properties.cornerRadius) {
    props.push(`radius: ${node.properties.cornerRadius}`);
  }

  let result = `${indent}${props.join(' | ')}`;

  if (node.children) {
    for (const child of node.children) {
      result += '\n' + summarizeNode(child, depth + 1);
    }
  }

  return result;
}

function summarizeDesignSystem(ds: DesignSystemContext): string {
  const parts: string[] = [];

  if (ds.paintStyles.length > 0) {
    const colors = ds.paintStyles.slice(0, 20).map(s => {
      const first = s.paints[0];
      if (first?.type === 'SOLID') {
        return `  ${s.name}: rgb(${r01(first.color.r)},${r01(first.color.g)},${r01(first.color.b)})`;
      }
      return `  ${s.name}: gradient`;
    });
    parts.push(`Paint Styles (${ds.paintStyles.length}):\n${colors.join('\n')}`);
  }

  if (ds.textStyles.length > 0) {
    const texts = ds.textStyles.slice(0, 15).map(s =>
      `  ${s.name}: ${s.style.fontFamily} ${s.style.fontStyle} ${s.style.fontSize}px`
    );
    parts.push(`Text Styles (${ds.textStyles.length}):\n${texts.join('\n')}`);
  }

  if (ds.variables.length > 0) {
    const vars = ds.variables.slice(0, 5).map(col =>
      `  Collection "${col.name}": ${col.variables.length} variables`
    );
    parts.push(`Variables:\n${vars.join('\n')}`);
  }

  if (ds.components.length > 0) {
    const comps = ds.components.slice(0, 20).map(c =>
      `  ${c.name}${c.description ? ` -- ${c.description}` : ''}`
    );
    parts.push(`Components (${ds.components.length}):\n${comps.join('\n')}`);
  }

  return parts.length > 0 ? parts.join('\n\n') : 'No design system defined in this file.';
}

function r01(v: number): number {
  return Math.round(v * 255);
}
