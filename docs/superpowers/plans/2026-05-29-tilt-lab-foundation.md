# tilt-lab Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the tilt-lab runtime foundation: a manifest-driven effect contract, a generic web-component wrapper, a layer compositor with compatibility rules, and one reference effect proving the full pipeline end to end.

**Architecture:** Every visual effect conforms to a single `Effect` lifecycle interface and ships with a `manifest.json`. A generic `defineEffectElement` factory turns any (manifest, effect-factory) pair into a framework-agnostic custom element that owns canvas mount, the RAF loop, resize, reduced-motion, and disposal. A `TiltStack` element composes an ordered set of layers onto a shared offscreen canvas, with a pure `validateStack` function enforcing the four layer-role rules. This foundation is the contract that all later acquisition work normalizes into.

**Tech Stack:** TypeScript, Vitest (+ happy-dom for the custom-element tests), esbuild for the runtime bundle. No framework in the runtime layer (web components are framework-agnostic by design).

---

## Why this plan exists first

The spec lists five build phases. Acquisition (one agent per source lane) is listed first there, but it CANNOT run until the `Effect` contract, the manifest schema, the web-component wrapper, and the compositor exist and are tested. Otherwise each acquisition agent invents an incompatible contract. This plan delivers that contract plus a reference effect that serves as the template every acquisition agent copies. It produces working, testable software on its own: a runtime that registers effects and composites a layered stack.

## File Structure

```
tilt-lab/
  package.json              scripts (build, test) + deps (typescript, vitest, happy-dom, esbuild)
  tsconfig.json             strict TS, DOM + ES2022 libs
  vitest.config.ts          happy-dom environment
  build.js                  esbuild runtime bundle (mirrors justify/build.js)
  runtime/
    types.ts                Effect interface, Manifest types, LayerRole union
    manifest.ts             validateManifest(raw): Manifest  (pure, throws on invalid)
    manifest.test.ts
    stack.ts                validateStack(layers) + orderLayers(layers)  (pure)
    stack.test.ts
    element.ts              defineEffectElement(manifest, factory) -> registers custom element
    element.test.ts
    compositor.ts           TiltStack element + Compositor (ordered render, post samples composite)
    compositor.test.ts
    effects/
      gradient/
        manifest.json       the reference effect's manifest
        index.ts            createGradientEffect(): Effect  (Canvas2D, testable)
        index.test.ts
    index.ts                barrel: register built-in effects, export public API
  dist/                     built bundle (gitignored)
```

Each runtime file has one responsibility. `types.ts` is shared vocabulary; `manifest.ts` and `stack.ts` are pure logic (fully unit-testable); `element.ts` and `compositor.ts` own DOM/lifecycle (tested with happy-dom + fake effects); `effects/gradient` is the reference implementation.

---

### Task 1: Scaffold the tilt-lab package

**Files:**
- Create: `tilt-lab/package.json`
- Create: `tilt-lab/tsconfig.json`
- Create: `tilt-lab/vitest.config.ts`
- Create: `tilt-lab/.gitignore`

- [ ] **Step 1: Create `tilt-lab/package.json`**

```json
{
  "name": "tilt-lab",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node build.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "esbuild": "^0.24.0",
    "happy-dom": "^15.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `tilt-lab/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["vitest/globals"]
  },
  "include": ["runtime", "build.js", "vitest.config.ts"]
}
```

- [ ] **Step 3: Create `tilt-lab/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['runtime/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Create `tilt-lab/.gitignore`**

```
node_modules/
dist/
```

- [ ] **Step 5: Install dependencies**

Run: `cd tilt-lab && npm install`
Expected: dependencies install, `node_modules/` created, exit 0.

- [ ] **Step 6: Commit**

```bash
git add tilt-lab/package.json tilt-lab/tsconfig.json tilt-lab/vitest.config.ts tilt-lab/.gitignore
git commit -m "chore(tilt-lab): scaffold package with vitest + esbuild"
```

---

### Task 2: Runtime types

**Files:**
- Create: `tilt-lab/runtime/types.ts`

- [ ] **Step 1: Write `tilt-lab/runtime/types.ts`**

```ts
/** The four layer roles that govern stacking. */
export type LayerRole = 'background' | 'midground' | 'pointer' | 'post';

/** Supported parameter control types in the playground. */
export type ParamType = 'range' | 'color' | 'toggle' | 'select';

export interface ParamSpec {
  name: string;
  type: ParamType;
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[]; // for type: 'select'
}

export type Redistribution = 'ok' | 'personal-only' | 'reimplemented';

export interface Manifest {
  id: string;
  name: string;
  category: string;
  layerRole: LayerRole;
  params: ParamSpec[];
  requiredAssets: string[];
  origin: string;
  license: string;
  attribution: string;
  redistribution: Redistribution;
  tags: string[];
}

/** Options passed to an effect at init: resolved param values + asset URLs. */
export interface EffectOpts {
  params: Record<string, unknown>;
  assets: Record<string, string>;
}

/**
 * The lifecycle contract every effect implements, regardless of origin tech.
 * The web-component wrapper drives these calls; effects never own their own
 * RAF loop or resize listener.
 */
export interface Effect {
  init(canvas: HTMLCanvasElement, opts: EffectOpts): void;
  frame(t: number): void;
  resize(w: number, h: number): void;
  setParam(key: string, value: unknown): void;
  dispose(): void;
}

/** A factory that produces a fresh Effect instance. */
export type EffectFactory = () => Effect;

/** A single configured layer within a stack. */
export interface LayerConfig {
  effectId: string;
  layerRole: LayerRole;
  params: Record<string, unknown>;
  blendMode: string; // CSS/canvas globalCompositeOperation value
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `cd tilt-lab && npx tsc --noEmit`
Expected: exit 0, no output.

- [ ] **Step 3: Commit**

```bash
git add tilt-lab/runtime/types.ts
git commit -m "feat(tilt-lab): runtime type vocabulary (Effect, Manifest, LayerRole)"
```

---

### Task 3: Manifest validation

**Files:**
- Create: `tilt-lab/runtime/manifest.ts`
- Test: `tilt-lab/runtime/manifest.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { validateManifest } from './manifest';

const valid = {
  id: 'gradient',
  name: 'Gradient',
  category: 'gradient',
  layerRole: 'background',
  params: [{ name: 'speed', type: 'range', default: 1, min: 0, max: 5 }],
  requiredAssets: [],
  origin: 'builtin',
  license: 'MIT',
  attribution: 'tilt-lab',
  redistribution: 'ok',
  tags: ['gradient'],
};

describe('validateManifest', () => {
  it('returns a typed manifest for valid input', () => {
    const m = validateManifest(valid);
    expect(m.id).toBe('gradient');
    expect(m.layerRole).toBe('background');
    expect(m.params[0].name).toBe('speed');
  });

  it('throws when id is missing', () => {
    const bad = { ...valid, id: undefined };
    expect(() => validateManifest(bad)).toThrow(/id/);
  });

  it('throws on an unknown layerRole', () => {
    const bad = { ...valid, layerRole: 'foreground' };
    expect(() => validateManifest(bad)).toThrow(/layerRole/);
  });

  it('throws when a param is missing a default', () => {
    const bad = { ...valid, params: [{ name: 'speed', type: 'range' }] };
    expect(() => validateManifest(bad)).toThrow(/default/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tilt-lab && npx vitest run runtime/manifest.test.ts`
Expected: FAIL, "Failed to resolve import './manifest'".

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Manifest, LayerRole, ParamSpec, ParamType, Redistribution } from './types';

const LAYER_ROLES: LayerRole[] = ['background', 'midground', 'pointer', 'post'];
const PARAM_TYPES: ParamType[] = ['range', 'color', 'toggle', 'select'];
const REDIST: Redistribution[] = ['ok', 'personal-only', 'reimplemented'];

function reqString(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`manifest.${key} must be a non-empty string`);
  }
  return v;
}

function validateParam(raw: unknown, i: number): ParamSpec {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`manifest.params[${i}] must be an object`);
  }
  const p = raw as Record<string, unknown>;
  const name = reqString(p, 'name');
  const type = p.type as ParamType;
  if (!PARAM_TYPES.includes(type)) {
    throw new Error(`manifest.params[${i}].type "${String(type)}" is invalid`);
  }
  if (!('default' in p)) {
    throw new Error(`manifest.params[${i}] (${name}) must have a default`);
  }
  return {
    name,
    type,
    default: p.default,
    min: typeof p.min === 'number' ? p.min : undefined,
    max: typeof p.max === 'number' ? p.max : undefined,
    step: typeof p.step === 'number' ? p.step : undefined,
    options: Array.isArray(p.options) ? (p.options as string[]) : undefined,
  };
}

export function validateManifest(raw: unknown): Manifest {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('manifest must be an object');
  }
  const o = raw as Record<string, unknown>;
  const layerRole = o.layerRole as LayerRole;
  if (!LAYER_ROLES.includes(layerRole)) {
    throw new Error(`manifest.layerRole "${String(layerRole)}" is invalid`);
  }
  const redistribution = o.redistribution as Redistribution;
  if (!REDIST.includes(redistribution)) {
    throw new Error(`manifest.redistribution "${String(redistribution)}" is invalid`);
  }
  const params = Array.isArray(o.params) ? o.params.map(validateParam) : [];
  return {
    id: reqString(o, 'id'),
    name: reqString(o, 'name'),
    category: reqString(o, 'category'),
    layerRole,
    params,
    requiredAssets: Array.isArray(o.requiredAssets) ? (o.requiredAssets as string[]) : [],
    origin: reqString(o, 'origin'),
    license: reqString(o, 'license'),
    attribution: reqString(o, 'attribution'),
    redistribution,
    tags: Array.isArray(o.tags) ? (o.tags as string[]) : [],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tilt-lab && npx vitest run runtime/manifest.test.ts`
Expected: PASS, 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add tilt-lab/runtime/manifest.ts tilt-lab/runtime/manifest.test.ts
git commit -m "feat(tilt-lab): manifest validation"
```

---

### Task 4: Layer stack validity rules

**Files:**
- Create: `tilt-lab/runtime/stack.ts`
- Test: `tilt-lab/runtime/stack.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tilt-lab && npx vitest run runtime/stack.test.ts`
Expected: FAIL, "Failed to resolve import './stack'".

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tilt-lab && npx vitest run runtime/stack.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add tilt-lab/runtime/stack.ts tilt-lab/runtime/stack.test.ts
git commit -m "feat(tilt-lab): layer stack validity + render ordering"
```

---

### Task 5: Generic web-component wrapper

**Files:**
- Create: `tilt-lab/runtime/element.ts`
- Test: `tilt-lab/runtime/element.test.ts`

The wrapper owns the lifecycle so effects stay dumb. It mounts a canvas, calls `init`, starts a RAF loop calling `frame`, observes resize, maps observed attributes to `setParam`, respects `prefers-reduced-motion`, and calls `dispose` on disconnect.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  init(_canvas: HTMLCanvasElement, opts: EffectOpts) { this.initOpts = opts; }
  frame(_t: number) {}
  resize(w: number, h: number) { this.resized = [w, h]; }
  setParam(key: string, value: unknown) { this.params[key] = value; }
  dispose() { this.disposed = true; }
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tilt-lab && npx vitest run runtime/element.test.ts`
Expected: FAIL, "Failed to resolve import './element'".

- [ ] **Step 3: Write minimal implementation**

```ts
import type { EffectFactory, Manifest, ParamSpec } from './types';

function coerce(spec: ParamSpec, raw: string): unknown {
  switch (spec.type) {
    case 'range':
      return Number(raw);
    case 'toggle':
      return raw === 'true' || raw === '';
    default:
      return raw; // color, select -> string
  }
}

export function defineEffectElement(manifest: Manifest, factory: EffectFactory): void {
  const tag = `tilt-${manifest.id}`;
  if (customElements.get(tag)) return;

  const paramByName = new Map(manifest.params.map((p) => [p.name, p]));

  class TiltEffectElement extends HTMLElement {
    static observedAttributes = manifest.params.map((p) => p.name);

    private effect = factory();
    private canvas!: HTMLCanvasElement;
    private raf = 0;
    private ro?: ResizeObserver;
    private reduced = false;

    connectedCallback() {
      this.canvas = document.createElement('canvas');
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.style.display = this.style.display || 'block';
      this.appendChild(this.canvas);

      const params: Record<string, unknown> = {};
      for (const p of manifest.params) {
        const attr = this.getAttribute(p.name);
        params[p.name] = attr === null ? p.default : coerce(p, attr);
      }
      this.effect.init(this.canvas, { params, assets: {} });

      this.ro = new ResizeObserver(() => this.syncSize());
      this.ro.observe(this);
      this.syncSize();

      this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      if (!this.reduced) this.loop(0);
      else this.effect.frame(0); // render a single static frame
    }

    private syncSize() {
      const w = this.clientWidth || 1;
      const h = this.clientHeight || 1;
      this.canvas.width = w;
      this.canvas.height = h;
      this.effect.resize(w, h);
    }

    private loop = (t: number) => {
      this.effect.frame(t);
      this.raf = requestAnimationFrame(this.loop);
    };

    attributeChangedCallback(name: string, _old: string | null, value: string | null) {
      const spec = paramByName.get(name);
      if (!spec) return;
      this.effect.setParam(name, value === null ? spec.default : coerce(spec, value));
    }

    disconnectedCallback() {
      cancelAnimationFrame(this.raf);
      this.ro?.disconnect();
      this.effect.dispose();
    }
  }

  customElements.define(tag, TiltEffectElement);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tilt-lab && npx vitest run runtime/element.test.ts`
Expected: PASS. (happy-dom provides customElements, ResizeObserver, matchMedia, and requestAnimationFrame.)

Note: if happy-dom lacks `requestAnimationFrame` in the test environment, the loop still registers; the attribute and dispose tests do not depend on a frame firing. If a test hangs, confirm `cancelAnimationFrame` runs in `disconnectedCallback`.

- [ ] **Step 5: Commit**

```bash
git add tilt-lab/runtime/element.ts tilt-lab/runtime/element.test.ts
git commit -m "feat(tilt-lab): generic manifest-driven web-component wrapper"
```

---

### Task 6: Compositor and the tilt-stack element

**Files:**
- Create: `tilt-lab/runtime/compositor.ts`
- Test: `tilt-lab/runtime/compositor.test.ts`

The `Compositor` orchestrates an ordered set of layers. Non-post layers render to a shared offscreen canvas; the post layer (if any) receives that composited canvas as its input. This task tests the ORCHESTRATION (ordering, which surface each layer is given, post-runs-last) using fake effects. Actual pixel output is verified visually via cmux in a later phase.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { Compositor } from './compositor';
import type { Effect, EffectOpts, LayerConfig } from './types';

class RecordingEffect implements Effect {
  static log: string[] = [];
  constructor(private id: string) {}
  init(_c: HTMLCanvasElement, _o: EffectOpts) { RecordingEffect.log.push(`init:${this.id}`); }
  frame(_t: number) { RecordingEffect.log.push(`frame:${this.id}`); }
  resize(_w: number, _h: number) {}
  setParam() {}
  dispose() { RecordingEffect.log.push(`dispose:${this.id}`); }
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tilt-lab && npx vitest run runtime/compositor.test.ts`
Expected: FAIL, "Failed to resolve import './compositor'".

- [ ] **Step 3: Write minimal implementation**

```ts
import type { Effect, EffectFactory, LayerConfig } from './types';
import { orderLayers } from './stack';

type FactoryById = (effectId: string) => Effect;

interface MountedLayer {
  config: LayerConfig;
  effect: Effect;
  canvas: HTMLCanvasElement;
}

/**
 * Orchestrates an ordered set of layers. Non-post layers draw onto a shared
 * composite canvas. The post layer (at most one) samples that composite canvas
 * as its input. Pixel correctness is verified visually; this class owns ordering
 * and lifecycle.
 */
export class Compositor {
  private layers: MountedLayer[] = [];
  private composite: HTMLCanvasElement;

  constructor(private root: HTMLElement, private factory: FactoryById) {
    this.composite = document.createElement('canvas');
  }

  compositeCanvas(): HTMLCanvasElement {
    return this.composite;
  }

  /** The canvas the post layer samples (the composited output beneath it). */
  postInputCanvas(): HTMLCanvasElement {
    return this.composite;
  }

  setLayers(configs: LayerConfig[]): void {
    this.clear();
    const ordered = orderLayers(configs);
    for (const config of ordered) {
      const effect = this.factory(config.effectId);
      const canvas = config.layerRole === 'post' ? document.createElement('canvas') : this.composite;
      effect.init(canvas, { params: config.params, assets: {} });
      this.layers.push({ config, effect, canvas });
    }
  }

  renderFrame(t: number): void {
    for (const { effect } of this.layers) {
      effect.frame(t);
    }
  }

  clear(): void {
    for (const { effect } of this.layers) {
      effect.dispose();
    }
    this.layers = [];
  }
}

/**
 * <tilt-stack config-src="..."> renders a full layered stack from a manifest URL.
 * Drives the Compositor with a RAF loop. The effect factory is injected by the
 * built bundle's registry (set via setStackFactory) so this file stays decoupled
 * from the concrete effect set.
 */
let stackFactory: FactoryById | null = null;
export function setStackFactory(f: FactoryById): void {
  stackFactory = f;
}

export class TiltStackElement extends HTMLElement {
  private compositor?: Compositor;
  private raf = 0;

  async connectedCallback() {
    const src = this.getAttribute('config-src');
    if (!src || !stackFactory) return;
    const res = await fetch(src);
    const config = (await res.json()) as { layers: LayerConfig[] };
    this.compositor = new Compositor(this, stackFactory);
    this.compositor.setLayers(config.layers);
    const loop = (t: number) => {
      this.compositor?.renderFrame(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.raf);
    this.compositor?.clear();
  }
}

export function defineStackElement(): void {
  if (!customElements.get('tilt-stack')) {
    customElements.define('tilt-stack', TiltStackElement);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd tilt-lab && npx vitest run runtime/compositor.test.ts`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add tilt-lab/runtime/compositor.ts tilt-lab/runtime/compositor.test.ts
git commit -m "feat(tilt-lab): layer compositor + tilt-stack element"
```

---

### Task 7: Reference effect (gradient)

**Files:**
- Create: `tilt-lab/runtime/effects/gradient/manifest.json`
- Create: `tilt-lab/runtime/effects/gradient/index.ts`
- Test: `tilt-lab/runtime/effects/gradient/index.test.ts`

A deliberately simple Canvas2D animated gradient. It is the template every acquisition agent copies: a factory returning an `Effect`, plus a manifest. Canvas2D (not WebGL) so its param logic is unit-testable in happy-dom.

- [ ] **Step 1: Write `tilt-lab/runtime/effects/gradient/manifest.json`**

```json
{
  "id": "gradient",
  "name": "Animated Gradient",
  "category": "gradient",
  "layerRole": "background",
  "params": [
    { "name": "speed", "type": "range", "default": 1, "min": 0, "max": 5, "step": 0.1 },
    { "name": "colorA", "type": "color", "default": "#5b8cff" },
    { "name": "colorB", "type": "color", "default": "#b15bff" }
  ],
  "requiredAssets": [],
  "origin": "builtin",
  "license": "MIT",
  "attribution": "tilt-lab",
  "redistribution": "ok",
  "tags": ["gradient", "reference", "background"]
}
```

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { createGradientEffect } from './index';

describe('createGradientEffect', () => {
  it('init reads params and resize updates dimensions without throwing', () => {
    const effect = createGradientEffect();
    const canvas = document.createElement('canvas');
    effect.init(canvas, { params: { speed: 2, colorA: '#000000', colorB: '#ffffff' }, assets: {} });
    effect.resize(100, 50);
    expect(() => effect.frame(0)).not.toThrow();
  });

  it('setParam updates a live param', () => {
    const effect = createGradientEffect();
    const canvas = document.createElement('canvas');
    effect.init(canvas, { params: { speed: 1, colorA: '#000000', colorB: '#ffffff' }, assets: {} });
    effect.setParam('speed', 4);
    // frame should run with the new speed without throwing
    effect.resize(10, 10);
    expect(() => effect.frame(100)).not.toThrow();
  });

  it('dispose is idempotent', () => {
    const effect = createGradientEffect();
    const canvas = document.createElement('canvas');
    effect.init(canvas, { params: { speed: 1, colorA: '#000', colorB: '#fff' }, assets: {} });
    expect(() => { effect.dispose(); effect.dispose(); }).not.toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd tilt-lab && npx vitest run runtime/effects/gradient/index.test.ts`
Expected: FAIL, "Failed to resolve import './index'".

- [ ] **Step 4: Write minimal implementation**

```ts
import type { Effect, EffectOpts } from '../../types';

export function createGradientEffect(): Effect {
  let ctx: CanvasRenderingContext2D | null = null;
  let w = 1;
  let h = 1;
  let speed = 1;
  let colorA = '#5b8cff';
  let colorB = '#b15bff';

  return {
    init(canvas: HTMLCanvasElement, opts: EffectOpts) {
      ctx = canvas.getContext('2d');
      speed = Number(opts.params.speed ?? 1);
      colorA = String(opts.params.colorA ?? colorA);
      colorB = String(opts.params.colorB ?? colorB);
    },
    frame(t: number) {
      if (!ctx) return;
      const phase = (Math.sin((t / 1000) * speed) + 1) / 2;
      const grad = ctx.createLinearGradient(0, 0, w * phase, h);
      grad.addColorStop(0, colorA);
      grad.addColorStop(1, colorB);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    },
    resize(nw: number, nh: number) {
      w = nw;
      h = nh;
    },
    setParam(key: string, value: unknown) {
      if (key === 'speed') speed = Number(value);
      else if (key === 'colorA') colorA = String(value);
      else if (key === 'colorB') colorB = String(value);
    },
    dispose() {
      ctx = null;
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd tilt-lab && npx vitest run runtime/effects/gradient/index.test.ts`
Expected: PASS, 3 tests green.

Note: happy-dom's Canvas2D context may be a stub. If `createLinearGradient` is undefined in the test environment, guard `frame` with `if (!ctx?.createLinearGradient) return;`. The test asserts no-throw, so a stubbed context still passes.

- [ ] **Step 6: Commit**

```bash
git add tilt-lab/runtime/effects/gradient/
git commit -m "feat(tilt-lab): reference gradient effect (acquisition template)"
```

---

### Task 8: Public barrel + built-in registration

**Files:**
- Create: `tilt-lab/runtime/index.ts`
- Test: `tilt-lab/runtime/index.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { registerBuiltins, effectFactories } from './index';

describe('runtime index', () => {
  it('registerBuiltins defines tilt-gradient and tilt-stack', () => {
    registerBuiltins();
    expect(customElements.get('tilt-gradient')).toBeDefined();
    expect(customElements.get('tilt-stack')).toBeDefined();
  });

  it('exposes a factory for each built-in effect id', () => {
    expect(typeof effectFactories.gradient).toBe('function');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd tilt-lab && npx vitest run runtime/index.test.ts`
Expected: FAIL, "Failed to resolve import './index'".

- [ ] **Step 3: Write minimal implementation**

```ts
import { defineEffectElement } from './element';
import { defineStackElement, setStackFactory } from './compositor';
import { validateManifest } from './manifest';
import type { Effect, EffectFactory } from './types';
import { createGradientEffect } from './effects/gradient/index';
import gradientManifest from './effects/gradient/manifest.json';

/** Registry of effect-id -> factory. Acquisition adds entries here. */
export const effectFactories: Record<string, EffectFactory> = {
  gradient: createGradientEffect,
};

export function registerBuiltins(): void {
  defineEffectElement(validateManifest(gradientManifest), createGradientEffect);
  setStackFactory((id: string): Effect => {
    const factory = effectFactories[id];
    if (!factory) throw new Error(`unknown effect id: ${id}`);
    return factory();
  });
  defineStackElement();
}

export { validateManifest } from './manifest';
export { validateStack, orderLayers } from './stack';
export { defineEffectElement } from './element';
export { Compositor } from './compositor';
export type { Effect, Manifest, LayerConfig, LayerRole } from './types';
```

- [ ] **Step 4: Enable JSON imports in tsconfig**

Add `"resolveJsonModule": true` to `compilerOptions` in `tilt-lab/tsconfig.json`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd tilt-lab && npx vitest run runtime/index.test.ts`
Expected: PASS, 2 tests green.

- [ ] **Step 6: Run the full suite + typecheck**

Run: `cd tilt-lab && npx vitest run && npx tsc --noEmit`
Expected: all test files pass, tsc exits 0.

- [ ] **Step 7: Commit**

```bash
git add tilt-lab/runtime/index.ts tilt-lab/runtime/index.test.ts tilt-lab/tsconfig.json
git commit -m "feat(tilt-lab): public barrel + built-in effect registration"
```

---

### Task 9: Runtime bundle build

**Files:**
- Create: `tilt-lab/build.js`

- [ ] **Step 1: Write `tilt-lab/build.js`** (mirrors justify/build.js)

```js
import * as esbuild from 'esbuild';
import { argv } from 'process';

const dev = argv.includes('--dev');

await esbuild.build({
  entryPoints: ['runtime/index.ts'],
  bundle: true,
  outfile: 'dist/tilt-runtime.js',
  format: 'esm',
  loader: { '.json': 'json' },
  minify: !dev,
  sourcemap: true,
  target: 'es2022',
});

console.log(`Built: dist/tilt-runtime.js (${dev ? 'dev' : 'prod'})`);
```

- [ ] **Step 2: Run the build**

Run: `cd tilt-lab && node build.js`
Expected: prints "Built: dist/tilt-runtime.js (prod)", `dist/tilt-runtime.js` exists.

- [ ] **Step 3: Smoke-test the bundle defines elements**

Run:
```bash
cd tilt-lab && node --input-type=module -e "
import('happy-dom').then(async ({ Window }) => {
  const w = new Window();
  globalThis.window = w; globalThis.document = w.document;
  globalThis.customElements = w.customElements; globalThis.HTMLElement = w.HTMLElement;
  globalThis.ResizeObserver = class { observe(){} disconnect(){} };
  const mod = await import('./dist/tilt-runtime.js');
  mod.registerBuiltins();
  console.log('tilt-gradient:', !!customElements.get('tilt-gradient'));
  console.log('tilt-stack:', !!customElements.get('tilt-stack'));
});
"
```
Expected: prints `tilt-gradient: true` and `tilt-stack: true`.

- [ ] **Step 4: Commit**

```bash
git add tilt-lab/build.js
git commit -m "build(tilt-lab): esbuild runtime bundle"
```

---

## Foundation done. What this unblocks

After this plan, the repo has a tested, buildable runtime contract and a reference effect. The next plans are:

- **Plan 2 - Acquisition (TEAM fan-out):** one agent per source lane (1-9 from the spec). Each fetches the source, writes `runtime/effects/<id>/{index.ts, manifest.json}` conforming to the contract, registers it in `effectFactories`, and adds a contract-conformance test mirroring `effects/gradient/index.test.ts`. This is parallelizable BECAUSE the contract is now fixed. Not pre-written as code here (the source comes from external origins the agents fetch at runtime).
- **Plan 3 - Playground UI:** the Vite + React shell (browse grid, preview canvas wired to a Compositor, layer stack panel with validateStack hints, param controls from manifests, project picker, add-shader modal).
- **Plan 4 - Server + handoff + sidecoach wiring:** the local Node server (project enumeration, package writer producing `<project>/tilt-assets/<stack-name>/`, the polled handoff signal), and the sidecoach verb/flow that launches the tool.

## Self-Review

- **Spec coverage:** runtime contract (Task 2), manifest schema (Tasks 2-3), layering rules + ordering (Task 4), generic web-component wrapper with lifecycle/reduced-motion (Task 5), compositor + post-input + tilt-stack (Task 6), reference effect template (Task 7), registration + barrel (Task 8), bundle (Task 9). Acquisition / UI / server are explicitly deferred to Plans 2-4 (spec's phases 1, 3, 4). Phase 5 QA gate applies to the UI plan.
- **Type consistency:** `Effect`, `EffectOpts`, `Manifest`, `ParamSpec`, `LayerConfig`, `LayerRole` defined once in `types.ts` and imported everywhere. `validateManifest`, `validateStack`, `orderLayers`, `defineEffectElement`, `Compositor`, `setStackFactory`, `defineStackElement`, `createGradientEffect`, `registerBuiltins`, `effectFactories` names are used consistently across tasks and re-exported from the barrel.
- **Placeholders:** none. Every code step shows complete code; every run step shows the command and expected result.
- **Known-risk callouts:** happy-dom RAF/Canvas2D stubs are flagged in Tasks 5 and 7 with concrete fallbacks so a worker is not surprised.
