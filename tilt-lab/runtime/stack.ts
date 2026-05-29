import type { LayerConfig, LayerRole } from './types';

const ROLE_ORDER: LayerRole[] = ['background', 'midground', 'pointer', 'post'];

export interface StackValidity {
  valid: boolean;
  reason?: string;
}

export function validateStack(layers: LayerConfig[]): StackValidity {
  const backgrounds = layers.filter((l) => l.layerRole === 'background').length;
  if (backgrounds > 1) {
    return { valid: false, reason: 'A stack may have at most one background layer.' };
  }
  const posts = layers.filter((l) => l.layerRole === 'post').length;
  if (posts > 1) {
    return { valid: false, reason: 'A stack may have at most one post-process layer.' };
  }
  return { valid: true };
}

/** Stable sort into render order: background -> midground -> pointer -> post. */
export function orderLayers(layers: LayerConfig[]): LayerConfig[] {
  return layers
    .map((layer, index) => ({ layer, index }))
    .sort((a, b) => {
      const ra = ROLE_ORDER.indexOf(a.layer.layerRole);
      const rb = ROLE_ORDER.indexOf(b.layer.layerRole);
      return ra !== rb ? ra - rb : a.index - b.index;
    })
    .map((x) => x.layer);
}
