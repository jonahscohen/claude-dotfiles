import type {
  DesignSystemContext,
  SerializedPaintStyle,
  SerializedTextStyleDef,
  SerializedEffectStyle,
  SerializedVariableCollection,
  SerializedComponent,
  SerializedPaint,
  SerializedGradientPaint,
  SerializedEffect,
} from '../types';

export async function extractDesignSystem(): Promise<DesignSystemContext> {
  const [paintStyles, textStyles, effectStyles, variables, components] = await Promise.all([
    extractPaintStyles(),
    extractTextStyles(),
    extractEffectStyles(),
    extractVariables(),
    extractComponents(),
  ]);

  return { paintStyles, textStyles, effectStyles, variables, components };
}

async function extractPaintStyles(): Promise<SerializedPaintStyle[]> {
  const styles = await figma.getLocalPaintStylesAsync();
  return styles.map(style => ({
    id: style.id,
    name: style.name,
    paints: (style.paints as Paint[]).map(serializePaint),
  }));
}

async function extractTextStyles(): Promise<SerializedTextStyleDef[]> {
  const styles = await figma.getLocalTextStylesAsync();
  return styles.map(style => ({
    id: style.id,
    name: style.name,
    style: {
      fontFamily: style.fontName.family,
      fontStyle: style.fontName.style,
      fontSize: style.fontSize,
      lineHeight: style.lineHeight.unit === 'PIXELS' ? style.lineHeight.value : 'AUTO',
      letterSpacing: style.letterSpacing.unit === 'PIXELS' ? style.letterSpacing.value : 0,
      textDecoration: style.textDecoration as 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH',
      textCase: style.textCase as 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE',
    },
  }));
}

async function extractEffectStyles(): Promise<SerializedEffectStyle[]> {
  const styles = await figma.getLocalEffectStylesAsync();
  return styles.map(style => ({
    id: style.id,
    name: style.name,
    effects: (style.effects as Effect[]).map(serializeEffect),
  }));
}

async function extractVariables(): Promise<SerializedVariableCollection[]> {
  try {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const result: SerializedVariableCollection[] = [];

    for (const collection of collections) {
      const variables = await Promise.all(
        collection.variableIds.map(id => figma.variables.getVariableByIdAsync(id))
      );

      result.push({
        id: collection.id,
        name: collection.name,
        modes: collection.modes.map(m => ({ modeId: m.modeId, name: m.name })),
        variables: variables
          .filter((v): v is Variable => v !== null)
          .map(v => ({
            id: v.id,
            name: v.name,
            resolvedType: v.resolvedType,
            valuesByMode: Object.fromEntries(
              Object.entries(v.valuesByMode).map(([modeId, value]) => {
                // Serialize variable values to JSON-safe format
                if (typeof value === 'object' && value !== null && 'r' in value) {
                  const c = value as RGBA;
                  return [modeId, { r: c.r, g: c.g, b: c.b, a: c.a }];
                }
                return [modeId, value];
              })
            ),
          })),
      });
    }

    return result;
  } catch {
    return [];
  }
}

async function extractComponents(): Promise<SerializedComponent[]> {
  const components: SerializedComponent[] = [];

  function scanNode(node: SceneNode) {
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
    if ('children' in node) {
      for (const child of (node as FrameNode).children) {
        scanNode(child as SceneNode);
      }
    }
  }

  for (const child of figma.currentPage.children) {
    scanNode(child);
  }

  return components;
}

function serializePaint(paint: Paint): SerializedPaint {
  if (paint.type === 'SOLID') {
    return {
      type: 'SOLID',
      color: { r: paint.color.r, g: paint.color.g, b: paint.color.b },
      opacity: paint.opacity,
    };
  }
  if (paint.type.startsWith('GRADIENT_')) {
    const gp = paint as GradientPaint;
    return {
      type: paint.type as SerializedGradientPaint['type'],
      gradientStops: gp.gradientStops.map(s => ({
        position: s.position,
        color: { r: s.color.r, g: s.color.g, b: s.color.b, a: s.color.a },
      })),
      opacity: paint.opacity,
    };
  }
  return { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0 };
}

function serializeEffect(effect: Effect): SerializedEffect {
  const base: SerializedEffect = {
    type: effect.type as SerializedEffect['type'],
    radius: 'radius' in effect ? effect.radius : 0,
    visible: effect.visible,
  };
  if ('color' in effect && effect.color) {
    base.color = { r: effect.color.r, g: effect.color.g, b: effect.color.b, a: effect.color.a };
  }
  if ('offset' in effect && effect.offset) {
    base.offset = { x: effect.offset.x, y: effect.offset.y };
  }
  if ('spread' in effect) {
    base.spread = effect.spread;
  }
  return base;
}
