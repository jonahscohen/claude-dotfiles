import { describe, it, expect } from 'vitest';
import {
  buildStackConfig,
  serializeStackConfig,
  buildEmbedSnippet,
  DEFAULT_RUNTIME_URL,
  DEFAULT_EMBED_CLASS,
  STACK_CONFIG_FORMAT,
  STACK_CONFIG_VERSION,
} from './export';
import type { LayerConfig } from '../../../runtime/types';

// Build loosely-typed test layers so the suite is robust whether or not the
// runtime LayerConfig already declares enabled/opacity.
const base = {
  effectId: 'grid',
  layerRole: 'background',
  params: { speed: 2, color: '#fff' },
  blendMode: 'source-over',
} as unknown as LayerConfig;

describe('export', () => {
  it('builds a versioned config and defaults enabled/opacity', () => {
    const cfg = buildStackConfig([base]);
    expect(cfg.format).toBe(STACK_CONFIG_FORMAT);
    expect(cfg.version).toBe(STACK_CONFIG_VERSION);
    expect(cfg.layers).toHaveLength(1);
    expect(cfg.layers[0]).toMatchObject({
      effectId: 'grid',
      layerRole: 'background',
      blendMode: 'source-over',
      enabled: true,
      opacity: 1,
    });
    expect(cfg.layers[0].params).toEqual({ speed: 2, color: '#fff' });
  });

  it('preserves explicit enabled/opacity from the layer', () => {
    const composed = { ...base, enabled: false, opacity: 0.5 } as unknown as LayerConfig;
    const cfg = buildStackConfig([composed]);
    expect(cfg.layers[0].enabled).toBe(false);
    expect(cfg.layers[0].opacity).toBe(0.5);
  });

  it('serializes to valid JSON containing the layer fields', () => {
    const parsed = JSON.parse(serializeStackConfig([base]));
    expect(parsed.format).toBe(STACK_CONFIG_FORMAT);
    expect(parsed.layers[0].effectId).toBe('grid');
    expect(parsed.layers[0].opacity).toBe(1);
  });

  it('clones params so later mutation does not leak into the config', () => {
    const cfg = buildStackConfig([base]);
    (cfg.layers[0].params as Record<string, unknown>).speed = 999;
    expect((base.params as Record<string, unknown>).speed).toBe(2);
  });
});

describe('buildEmbedSnippet', () => {
  it('emits a self-contained block that mounts via the runtime', () => {
    const snippet = buildEmbedSnippet([base]);
    // Inlines the actual stack config (not a config-src URL to fetch).
    expect(snippet).toContain('"effectId": "grid"');
    expect(snippet).not.toContain('config-src');
    // Wires the host to the runtime's mountStack entry point.
    expect(snippet).toContain('mountStack(host, config)');
    expect(snippet).toContain(`import(${JSON.stringify(DEFAULT_RUNTIME_URL)})`);
    // Background host with the default class, positioned to fill its parent.
    expect(snippet).toContain(`class="${DEFAULT_EMBED_CLASS}"`);
    expect(snippet).toContain('position:absolute; inset:0');
    // Tells the consumer how to serve the runtime bundle.
    expect(snippet).toContain('tilt-runtime.js');
  });

  it('captures the host in a classic script (currentScript is null in modules)', () => {
    const snippet = buildEmbedSnippet([base]);
    expect(snippet).toContain('document.currentScript.previousElementSibling');
    // Must NOT be a module script, or document.currentScript would be null.
    expect(snippet).not.toContain('<script type="module">');
  });

  it('honors a custom runtimeUrl and className', () => {
    const snippet = buildEmbedSnippet([base], {
      runtimeUrl: '/assets/tilt-runtime.js',
      className: 'hero-bg',
    });
    expect(snippet).toContain('import("/assets/tilt-runtime.js")');
    expect(snippet).toContain('class="hero-bg"');
  });

  it('inlines valid JSON that round-trips to the stack config', () => {
    const snippet = buildEmbedSnippet([base]);
    const json = snippet.slice(snippet.indexOf('var config = ') + 'var config = '.length);
    const parsed = JSON.parse(json.slice(0, json.indexOf(';\n')));
    expect(parsed.format).toBe(STACK_CONFIG_FORMAT);
    expect(parsed.version).toBe(STACK_CONFIG_VERSION);
    expect(parsed.layers[0].effectId).toBe('grid');
  });
});
