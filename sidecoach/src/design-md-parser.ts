import * as yaml from 'js-yaml';

export interface DesignTokens {
  colors: Record<string, any>;
  typography: Record<string, any>;
  rounded: Record<string, string>;
  spacing: Record<string, any>;
  shadow: Record<string, string>;
  motion: Record<string, any>;
  bodyLineNumbers: { frontmatterStart: number; frontmatterEnd: number; bodyStart: number };
  raw: Record<string, any>;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseDesignMd(src: string): DesignTokens {
  const m = src.match(FRONTMATTER_RE);
  if (!m) {
    throw new Error('DESIGN.md: no YAML frontmatter found (expected leading --- block)');
  }
  const yamlText = m[1];
  const data = (yaml.load(yamlText) as Record<string, any>) || {};
  const before = src.slice(0, m.index ?? 0);
  const frontmatterStart = before.split('\n').length;
  const frontmatterEnd = frontmatterStart + yamlText.split('\n').length - 1;
  return {
    colors: data.colors || {},
    typography: data.typography || {},
    rounded: data.rounded || {},
    spacing: data.spacing || {},
    shadow: data.shadow || {},
    motion: data.motion || {},
    bodyLineNumbers: {
      frontmatterStart,
      frontmatterEnd,
      bodyStart: frontmatterEnd + 1,
    },
    raw: data,
  };
}

export function findTokenLine(src: string, dottedPath: string): number {
  const last = dottedPath.split('.').pop() || dottedPath;
  const lines = src.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith(`${last}:`) || t.startsWith(`"${last}":`) || t.startsWith(`'${last}':`)) {
      return i + 1;
    }
  }
  return -1;
}
