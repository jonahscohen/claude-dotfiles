import { describe, it, expect } from 'vitest';
import { createMediaEffect } from './index';
import manifest from './manifest.json';
import { validateManifest } from '../../manifest';

describe('media effect', () => {
  it('has a valid manifest with a file param', () => {
    expect(() => validateManifest(manifest)).not.toThrow();
    expect(manifest.params.some((p) => p.type === 'file')).toBe(true);
  });

  it('init + resize + frame run without throwing (no source)', () => {
    const e = createMediaEffect();
    const canvas = document.createElement('canvas');
    const params = Object.fromEntries(manifest.params.map((p) => [p.name, p.default]));
    e.init(canvas, { params, assets: {} });
    e.resize(64, 64);
    expect(() => e.frame(16)).not.toThrow();
  });

  it('setParam source/fit/opacity do not throw', () => {
    const e = createMediaEffect();
    const canvas = document.createElement('canvas');
    e.init(canvas, { params: { source: '', fit: 'cover', opacity: 1 }, assets: {} });
    e.resize(32, 32);
    expect(() => {
      e.setParam('source', 'blob:fake');
      e.setParam('fit', 'contain');
      e.setParam('opacity', 0.5);
      e.frame(0);
    }).not.toThrow();
  });

  it('dispose is idempotent', () => {
    const e = createMediaEffect();
    const canvas = document.createElement('canvas');
    e.init(canvas, { params: {}, assets: {} });
    expect(() => {
      e.dispose();
      e.dispose();
    }).not.toThrow();
  });
});
