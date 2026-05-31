import { describe, it, expect } from 'vitest';
import { createGlobeEffect } from './index';
import manifest from './manifest.json';
import { validateManifest } from '../../manifest';

describe('globe effect', () => {
  it('has a valid manifest', () => {
    expect(() => validateManifest(manifest)).not.toThrow();
  });

  it('ships cobe true-library defaults (not the README demo values)', () => {
    const byName = Object.fromEntries(manifest.params.map((p) => [p.name, p]));
    expect(byName.preset.default).toBe('Cobe Default');
    expect(byName.mapSamples.default).toBe(10000);
    expect(byName.mapBrightness.default).toBe(1);
    expect(byName.diffuse.default).toBe(1);
    expect(byName.dark.default).toBe(0);
    expect(byName.baseColor.default).toBe('#ffffff');
    expect(byName.markerColor.default).toBe('#ff8000');
  });

  it('exposes markers as an editable marker-list param', () => {
    const markers = manifest.params.find((p) => p.name === 'markers');
    expect(markers?.type).toBe('marker-list');
    expect(Array.isArray(markers?.default)).toBe(true);
  });

  it('accepts a live marker-list edit via setParam without throwing', () => {
    const e = createGlobeEffect();
    const canvas = document.createElement('canvas');
    const params = Object.fromEntries(manifest.params.map((p) => [p.name, p.default]));
    e.init(canvas, { params, assets: {} });
    e.resize(64, 64);
    expect(() =>
      e.setParam('markers', [{ location: [12, 34], size: 0.08 }]),
    ).not.toThrow();
    expect(() => e.frame(16)).not.toThrow();
  });

  it('init + resize + frame run without throwing', () => {
    const e = createGlobeEffect();
    const canvas = document.createElement('canvas');
    const params = Object.fromEntries(manifest.params.map((p) => [p.name, p.default]));
    e.init(canvas, { params, assets: {} });
    e.resize(64, 64);
    expect(() => e.frame(16)).not.toThrow();
  });

  it('dispose is idempotent', () => {
    const e = createGlobeEffect();
    const canvas = document.createElement('canvas');
    const params = Object.fromEntries(manifest.params.map((p) => [p.name, p.default]));
    e.init(canvas, { params, assets: {} });
    expect(() => {
      e.dispose();
      e.dispose();
    }).not.toThrow();
  });
});
