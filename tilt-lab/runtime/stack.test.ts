import { describe, it, expect } from 'vitest';
import { validateStack, orderLayers } from './stack';
import type { LayerConfig } from './types';

function layer(effectId: string, role: LayerConfig['layerRole']): LayerConfig {
  return { effectId, layerRole: role, params: {}, blendMode: 'source-over' };
}

describe('validateStack', () => {
  it('accepts an empty stack', () => {
    expect(validateStack([]).valid).toBe(true);
  });

  it('accepts one of each role', () => {
    const r = validateStack([
      layer('grad', 'background'),
      layer('globe', 'midground'),
      layer('trail', 'pointer'),
      layer('ascii', 'post'),
    ]);
    expect(r.valid).toBe(true);
  });

  it('rejects two backgrounds with a reason', () => {
    const r = validateStack([layer('grad', 'background'), layer('aurora', 'background')]);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/background/);
  });

  it('rejects two post layers', () => {
    const r = validateStack([layer('ascii', 'post'), layer('dither', 'post')]);
    expect(r.valid).toBe(false);
    expect(r.reason).toMatch(/post/);
  });

  it('allows multiple midground and pointer layers', () => {
    const r = validateStack([
      layer('globe', 'midground'),
      layer('particles', 'midground'),
      layer('trailA', 'pointer'),
      layer('trailB', 'pointer'),
    ]);
    expect(r.valid).toBe(true);
  });
});

describe('orderLayers', () => {
  it('orders background -> midground -> pointer -> post regardless of input order', () => {
    const ordered = orderLayers([
      layer('ascii', 'post'),
      layer('trail', 'pointer'),
      layer('grad', 'background'),
      layer('globe', 'midground'),
    ]);
    expect(ordered.map((l) => l.layerRole)).toEqual([
      'background',
      'midground',
      'pointer',
      'post',
    ]);
  });

  it('preserves relative order within the same role', () => {
    const ordered = orderLayers([
      layer('globeA', 'midground'),
      layer('globeB', 'midground'),
    ]);
    expect(ordered.map((l) => l.effectId)).toEqual(['globeA', 'globeB']);
  });
});
