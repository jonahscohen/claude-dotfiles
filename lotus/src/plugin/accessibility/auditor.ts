import type { AccessibilityReport, AccessibilityIssue, AuditSeverity } from '../types';
import { calculateContrastRatio, relativeLuminance } from './color-math';
import { walkTree } from '../nodes/traversal';

export function runAccessibilityAudit(root: SceneNode): AccessibilityReport {
  const issues: AccessibilityIssue[] = [];
  let checkedNodes = 0;

  walkTree(root, (node) => {
    checkedNodes++;

    // Check text contrast
    if (node.type === 'TEXT') {
      checkTextContrast(node as TextNode, issues);
      checkTextSize(node as TextNode, issues);
    }

    // Check touch target size
    if (isInteractiveElement(node)) {
      checkTouchTarget(node, issues);
    }

    // Check images for alt text
    if (hasImageFill(node)) {
      checkImageAltText(node, issues);
    }
  });

  const score = calculateScore(issues, checkedNodes);

  return { issues, score, checkedNodes };
}

function checkTextContrast(textNode: TextNode, issues: AccessibilityIssue[]): void {
  const fills = textNode.fills;
  if (fills === figma.mixed || !Array.isArray(fills) || fills.length === 0) return;

  const textFill = fills.find(f => f.type === 'SOLID' && f.visible !== false) as SolidPaint | undefined;
  if (!textFill) return;

  // Try to find parent background color
  const bgColor = findBackgroundColor(textNode);
  if (!bgColor) return;

  const contrast = calculateContrastRatio(textFill.color, bgColor);
  const fontSize = textNode.fontSize;
  const isBold = (() => {
    const fn = textNode.fontName;
    return fn !== figma.mixed && /bold|semibold|black|heavy/i.test(fn.style);
  })();
  const isLargeText = (typeof fontSize === 'number') &&
    (fontSize >= 18 || (fontSize >= 14 && isBold));

  // WCAG AA: 4.5:1 for normal, 3:1 for large
  const aaThreshold = isLargeText ? 3 : 4.5;
  // WCAG AAA: 7:1 for normal, 4.5:1 for large
  const aaaThreshold = isLargeText ? 4.5 : 7;

  if (contrast < aaThreshold) {
    issues.push({
      severity: 'error',
      rule: 'color-contrast-aa',
      message: `Text contrast ratio ${contrast.toFixed(2)}:1 fails WCAG AA (minimum ${aaThreshold}:1)`,
      nodeId: textNode.id,
      nodeName: textNode.name,
      suggestion: `Increase contrast to at least ${aaThreshold}:1. Current ratio: ${contrast.toFixed(2)}:1`,
    });
  } else if (contrast < aaaThreshold) {
    issues.push({
      severity: 'warning',
      rule: 'color-contrast-aaa',
      message: `Text contrast ratio ${contrast.toFixed(2)}:1 passes AA but fails WCAG AAA (minimum ${aaaThreshold}:1)`,
      nodeId: textNode.id,
      nodeName: textNode.name,
      suggestion: `For enhanced accessibility, increase contrast to ${aaaThreshold}:1`,
    });
  }
}

function checkTextSize(textNode: TextNode, issues: AccessibilityIssue[]): void {
  const fontSize = textNode.fontSize;
  if (typeof fontSize !== 'number') return;

  if (fontSize < 12) {
    issues.push({
      severity: 'warning',
      rule: 'text-size',
      message: `Font size ${fontSize}px may be too small for comfortable reading`,
      nodeId: textNode.id,
      nodeName: textNode.name,
      suggestion: 'Consider using at least 12px for body text',
    });
  }
}

function checkTouchTarget(node: SceneNode, issues: AccessibilityIssue[]): void {
  if (!('width' in node) || !('height' in node)) return;
  const n = node as FrameNode;
  const minSize = 44; // WCAG 2.5.5

  if (n.width < minSize || n.height < minSize) {
    issues.push({
      severity: 'warning',
      rule: 'touch-target-size',
      message: `Interactive element is ${n.width}x${n.height}px (minimum recommended: ${minSize}x${minSize}px)`,
      nodeId: node.id,
      nodeName: node.name,
      suggestion: `Increase touch target to at least ${minSize}x${minSize}px for mobile accessibility`,
    });
  }
}

function checkImageAltText(node: SceneNode, issues: AccessibilityIssue[]): void {
  // In Figma, we check if the node has a descriptive name (not default)
  const defaultNames = ['Rectangle', 'Ellipse', 'Frame', 'Group', 'Image'];
  if (defaultNames.some(d => node.name.startsWith(d))) {
    issues.push({
      severity: 'info',
      rule: 'image-alt-text',
      message: 'Image element has a generic name -- consider adding a descriptive name for accessibility',
      nodeId: node.id,
      nodeName: node.name,
      suggestion: 'Rename this layer to describe the image content (used as alt text in code export)',
    });
  }
}

function isInteractiveElement(node: SceneNode): boolean {
  const name = node.name.toLowerCase();
  return /button|btn|link|input|select|checkbox|radio|toggle|switch|tab|menu/i.test(name);
}

function hasImageFill(node: SceneNode): boolean {
  if (!('fills' in node)) return false;
  const fills = (node as GeometryMixin).fills;
  if (fills === figma.mixed || !Array.isArray(fills)) return false;
  return fills.some(f => f.type === 'IMAGE');
}

function findBackgroundColor(node: SceneNode): RGB | null {
  let current: BaseNode | null = node.parent;

  while (current) {
    if ('fills' in current) {
      const fills = (current as FrameNode).fills;
      if (fills !== figma.mixed && Array.isArray(fills)) {
        const solidFill = fills.find(f => f.type === 'SOLID' && f.visible !== false) as SolidPaint | undefined;
        if (solidFill) return solidFill.color;
      }
    }
    current = current.parent;
  }

  // Default to white if no background found
  return { r: 1, g: 1, b: 1 };
}

// calculateContrastRatio and relativeLuminance imported from ./color-math

function calculateScore(issues: AccessibilityIssue[], checkedNodes: number): number {
  if (checkedNodes === 0) return 100;
  const errorWeight = 10;
  const warningWeight = 3;
  const infoWeight = 1;

  const penalty = issues.reduce((sum, issue) => {
    switch (issue.severity) {
      case 'error': return sum + errorWeight;
      case 'warning': return sum + warningWeight;
      case 'info': return sum + infoWeight;
      default: return sum;
    }
  }, 0);

  return Math.max(0, Math.round(100 - (penalty / checkedNodes) * 100));
}
