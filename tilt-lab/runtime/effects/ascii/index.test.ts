import { describe, it, expect } from 'vitest';
import { createAsciiEffect } from './index';
import manifest from './manifest.json';
import { validateManifest } from '../../manifest';

describe('ascii effect', () => {
  it('has a valid manifest', () => {
    expect(() => validateManifest(manifest)).not.toThrow();
  });

  it('exposes a customChars text param for a free-form glyph ramp', () => {
    const customChars = manifest.params.find((p) => p.name === 'customChars');
    expect(customChars?.type).toBe('text');
    expect(customChars?.default).toBe('');
  });

  it('accepts a customChars edit via setParam without throwing', () => {
    const e = createAsciiEffect();
    const canvas = document.createElement('canvas');
    const params = Object.fromEntries(manifest.params.map((p) => [p.name, p.default]));
    e.init(canvas, { params, assets: {} });
    e.resize(64, 64);
    expect(() => e.setParam('customChars', '01 ')).not.toThrow();
    expect(() => e.frame(16)).not.toThrow();
  });

  it('init + resize + frame run without throwing', () => {
    const e = createAsciiEffect();
    const canvas = document.createElement('canvas');
    const params = Object.fromEntries(manifest.params.map((p) => [p.name, p.default]));
    e.init(canvas, { params, assets: {} });
    e.resize(64, 64);
    expect(() => e.frame(16)).not.toThrow();
  });

  it('dispose is idempotent', () => {
    const e = createAsciiEffect();
    const canvas = document.createElement('canvas');
    const params = Object.fromEntries(manifest.params.map((p) => [p.name, p.default]));
    e.init(canvas, { params, assets: {} });
    expect(() => {
      e.dispose();
      e.dispose();
    }).not.toThrow();
  });
});
