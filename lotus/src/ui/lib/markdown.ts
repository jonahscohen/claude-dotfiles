// Lightweight markdown-to-text utilities for chat rendering.
// Rich rendering happens in MessageBubble.tsx via React.

export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '[code block]')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function getCodeBlocks(text: string): { language: string; code: string }[] {
  const blocks: { language: string; code: string }[] = [];
  const pattern = /```(\w*)\n?([\s\S]*?)```/g;
  let m;
  while ((m = pattern.exec(text)) !== null) {
    blocks.push({ language: m[1] || 'text', code: m[2].trim() });
  }
  return blocks;
}
