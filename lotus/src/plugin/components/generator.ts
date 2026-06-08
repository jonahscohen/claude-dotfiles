import type { VariantConfig } from '../types';

export async function generateComponentSet(
  baseNode: SceneNode,
  config: VariantConfig
): Promise<ComponentSetNode> {
  // Create the base component from the node
  let baseComponent: ComponentNode;

  if (baseNode.type === 'COMPONENT') {
    baseComponent = baseNode as ComponentNode;
  } else {
    baseComponent = figma.createComponentFromNode(baseNode);
  }

  // Generate Cartesian product of all variant axes
  const combinations = cartesianProduct(config.axes.map(a => a.values));
  const axisNames = config.axes.map(a => a.name);

  // Create variant components
  const variants: ComponentNode[] = [];

  for (const combo of combinations) {
    // Build variant name: "Size=Small, State=Default"
    const variantName = axisNames
      .map((name, i) => `${name}=${combo[i]}`)
      .join(', ');

    // Clone the base component
    const variant = baseComponent.clone();
    variant.name = variantName;

    // Apply any overrides for this combination
    if (config.overrides) {
      const overrideKey = combo.join('/');
      const overrides = config.overrides[overrideKey];
      if (overrides) {
        if (overrides.fills && 'fills' in variant) {
          (variant as unknown as MinimalFillsMixin).fills = overrides.fills.map(f => {
            if (f.type === 'SOLID') {
              return {
                type: 'SOLID' as const,
                color: { r: f.color.r, g: f.color.g, b: f.color.b },
                opacity: f.opacity ?? 1,
                visible: f.visible ?? true,
              };
            }
            return { type: 'SOLID' as const, color: { r: 0, g: 0, b: 0 }, opacity: 1, visible: true };
          }) as SolidPaint[];
        }
        if (overrides.opacity !== undefined) {
          variant.opacity = overrides.opacity;
        }
      }
    }

    variants.push(variant);
  }

  // Combine into a component set
  const allComponents = [baseComponent, ...variants];

  // Name the base component with default variant values
  baseComponent.name = axisNames
    .map((name, i) => `${name}=${config.axes[i].values[0]}`)
    .join(', ');

  const componentSet = figma.combineAsVariants(allComponents, figma.currentPage);
  componentSet.name = baseNode.name || 'Component Set';

  // Apply auto-layout to the component set for organization
  componentSet.layoutMode = 'HORIZONTAL';
  componentSet.layoutWrap = 'WRAP';
  componentSet.itemSpacing = 20;
  componentSet.counterAxisSpacing = 20;
  componentSet.paddingTop = 20;
  componentSet.paddingRight = 20;
  componentSet.paddingBottom = 20;
  componentSet.paddingLeft = 20;

  return componentSet;
}

function cartesianProduct(arrays: string[][]): string[][] {
  if (arrays.length === 0) return [[]];
  return arrays.reduce<string[][]>(
    (acc, arr) => acc.flatMap(combo => arr.map(val => [...combo, val])),
    [[]]
  );
}
