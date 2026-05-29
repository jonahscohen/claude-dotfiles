import { describe, it, expect } from 'vitest';
import { Compositor } from './compositor';
import type { Effect, EffectOpts, LayerConfig } from './types';

class RecordingEffect implements Effect {
  static log: string[] = [];
  constructor(private id: string) {}
  init(_c: HTMLCanvasElement, _o: EffectOpts) {
    RecordingEffect.log.push(`init:${this.id}`);
  }
  frame(_t: number) {
    RecordingEffect.log.push(`frame:${this.id}`);
  }
  resize(_w: number, _h: number) {}
  setParam() {}
  dispose() {
    RecordingEffect.log.push(`dispose:${this.id}`);
  }
}

function layer(effectId: string, role: LayerConfig['layerRole']): LayerConfig {
  return { effectId, layerRole: role, params: {}, blendMode: 'source-over' };
}

describe('Compositor', () => {
  it('inits layers in render order (background first, post last)', () => {
    RecordingEffect.log = [];
    const root = document.createElement('div');
    const c = new Compositor(root, (id) => new RecordingEffect(id));
    c.setLayers([layer('ascii', 'post'), layer('grad', 'background'), layer('globe', 'midground')]);
    expect(RecordingEffect.log).toEqual(['init:grad', 'init:globe', 'init:ascii']);
  });

  it('renders a frame for every layer in order', () => {
    RecordingEffect.log = [];
    const root = document.createElement('div');
    const c = new Compositor(root, (id) => new RecordingEffect(id));
    c.setLayers([layer('grad', 'background'), layer('ascii', 'post')]);
    RecordingEffect.log = [];
    c.renderFrame(16);
    expect(RecordingEffect.log).toEqual(['frame:grad', 'frame:ascii']);
  });

  it('disposes all layers on clear', () => {
    RecordingEffect.log = [];
    const root = document.createElement('div');
    const c = new Compositor(root, (id) => new RecordingEffect(id));
    c.setLayers([layer('grad', 'background')]);
    RecordingEffect.log = [];
    c.clear();
    expect(RecordingEffect.log).toEqual(['dispose:grad']);
  });

  it('reports which canvas the post layer samples', () => {
    const root = document.createElement('div');
    const c = new Compositor(root, (id) => new RecordingEffect(id));
    c.setLayers([layer('grad', 'background'), layer('ascii', 'post')]);
    expect(c.postInputCanvas()).toBe(c.compositeCanvas());
  });
});
