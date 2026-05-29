import { describe, it, expect, beforeEach } from 'vitest';
import { defineEffectElement } from './element';
import type { Effect, EffectOpts, Manifest } from './types';

const manifest: Manifest = {
  id: 'fake',
  name: 'Fake',
  category: 'test',
  layerRole: 'background',
  params: [{ name: 'speed', type: 'range', default: 1, min: 0, max: 5 }],
  requiredAssets: [],
  origin: 'builtin',
  license: 'MIT',
  attribution: 'tilt-lab',
  redistribution: 'ok',
  tags: [],
};

class FakeEffect implements Effect {
  initOpts: EffectOpts | null = null;
  params: Record<string, unknown> = {};
  disposed = false;
  resized: [number, number] | null = null;
  init(_canvas: HTMLCanvasElement, opts: EffectOpts) {
    this.initOpts = opts;
  }
  frame(_t: number) {}
  resize(w: number, h: number) {
    this.resized = [w, h];
  }
  setParam(key: string, value: unknown) {
    this.params[key] = value;
  }
  dispose() {
    this.disposed = true;
  }
}

let current: FakeEffect;

beforeEach(() => {
  current = new FakeEffect();
});

describe('defineEffectElement', () => {
  it('registers a custom element under tilt-{id}', () => {
    defineEffectElement(manifest, () => current);
    expect(customElements.get('tilt-fake')).toBeDefined();
  });

  it('calls init with default params when connected', () => {
    const el = document.createElement('tilt-fake');
    document.body.appendChild(el);
    expect(current.initOpts?.params.speed).toBe(1);
  });

  it('maps an attribute change to setParam', () => {
    const el = document.createElement('tilt-fake');
    document.body.appendChild(el);
    el.setAttribute('speed', '3');
    expect(current.params.speed).toBe(3);
  });

  it('calls dispose on disconnect', () => {
    const el = document.createElement('tilt-fake');
    document.body.appendChild(el);
    el.remove();
    expect(current.disposed).toBe(true);
  });
});
