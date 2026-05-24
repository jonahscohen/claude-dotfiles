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
  const frontmatterEnd = frontmatterStart + yamlText.split('\n').length + 1;
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
  const segments = dottedPath.split('.').filter(Boolean);
  if (segments.length === 0) return -1;
  const lines = src.split('\n');
  let segIdx = 0;
  let expectedIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = line.length - line.trimStart().length;
    if (segIdx > 0 && indent < expectedIndent) {
      // walked out of the parent block before finding the next segment
      return -1;
    }
    if (indent !== expectedIndent) continue;

    const target = segments[segIdx];
    const matches =
      trimmed.startsWith(`${target}:`) ||
      trimmed.startsWith(`"${target}":`) ||
      trimmed.startsWith(`'${target}':`);
    if (matches) {
      segIdx++;
      if (segIdx === segments.length) return i + 1;
      expectedIndent += 2;
    }
  }
  return -1;
}
