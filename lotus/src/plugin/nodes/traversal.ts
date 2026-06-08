import type { SerializedNode } from '../types';
import { serializeNode } from './reader';

export function walkTree(
  node: SceneNode,
  callback: (node: SceneNode, depth: number) => boolean | void,
  depth = 0
): void {
  const shouldContinue = callback(node, depth);
  if (shouldContinue === false) return;

  if ('children' in node) {
    for (const child of (node as FrameNode).children) {
      walkTree(child as SceneNode, callback, depth + 1);
    }
  }
}

export function findNodesByName(
  root: SceneNode,
  namePattern: string | RegExp
): SceneNode[] {
  const results: SceneNode[] = [];
  const regex = typeof namePattern === 'string' ? new RegExp(namePattern, 'i') : namePattern;

  walkTree(root, (node) => {
    if (regex.test(node.name)) {
      results.push(node);
    }
  });

  return results;
}

export function findNodesByType(
  root: SceneNode,
  type: string
): SceneNode[] {
  const results: SceneNode[] = [];
  walkTree(root, (node) => {
    if (node.type === type) {
      results.push(node);
    }
  });
  return results;
}

export function countNodes(root: SceneNode): number {
  let count = 0;
  walkTree(root, () => { count++; });
  return count;
}

export function flattenTree(root: SceneNode, maxDepth = 10): SerializedNode[] {
  const results: SerializedNode[] = [];
  walkTree(root, (node, depth) => {
    if (depth > maxDepth) return false;
    results.push(serializeNode(node, 0));
  });
  return results;
}
