import type { SerializedComponent } from '../types';

export function scanLocalComponents(): SerializedComponent[] {
  const components: SerializedComponent[] = [];

  function scan(node: SceneNode) {
    if (node.type === 'COMPONENT') {
      const comp = node as ComponentNode;
      components.push({
        id: comp.id,
        name: comp.name,
        description: comp.description,
        properties: Object.fromEntries(
          Object.entries(comp.componentPropertyDefinitions).map(([key, def]) => [
            key,
            { type: def.type, defaultValue: def.defaultValue },
          ])
        ),
      });
    }

    if (node.type === 'COMPONENT_SET') {
      const set = node as ComponentSetNode;
      for (const child of set.children) {
        if (child.type === 'COMPONENT') {
          const comp = child as ComponentNode;
          components.push({
            id: comp.id,
            name: `${set.name} / ${comp.name}`,
            description: comp.description,
            properties: Object.fromEntries(
              Object.entries(comp.componentPropertyDefinitions).map(([key, def]) => [
                key,
                { type: def.type, defaultValue: def.defaultValue },
              ])
            ),
          });
        }
      }
      return; // Don't recurse into component set children
    }

    if ('children' in node) {
      for (const child of (node as FrameNode).children) {
        scan(child as SceneNode);
      }
    }
  }

  for (const child of figma.currentPage.children) {
    scan(child);
  }

  return components;
}
