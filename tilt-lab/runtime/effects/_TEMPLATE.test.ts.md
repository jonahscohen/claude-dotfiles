# Acquired-effect conformance test template

Every acquired effect MUST ship `index.test.ts` proving contract conformance. Copy this, replace `<id>` / `<Name>`, and keep all three cases.

```ts
import { describe, it, expect } from 'vitest';
import { create<Name>Effect } from './index';
import manifest from './manifest.json';
import { validateManifest } from '../../manifest';

describe('<id> effect', () => {
  it('has a valid manifest', () => {
    expect(() => validateManifest(manifest)).not.toThrow();
  });

  it('init + resize + frame run without throwing', () => {
    const e = create<Name>Effect();
    const canvas = document.createElement('canvas');
    const params = Object.fromEntries(manifest.params.map((p) => [p.name, p.default]));
    e.init(canvas, { params, assets: {} });
    e.resize(64, 64);
    expect(() => e.frame(16)).not.toThrow();
  });

  it('dispose is idempotent', () => {
    const e = create<Name>Effect();
    const canvas = document.createElement('canvas');
    const params = Object.fromEntries(manifest.params.map((p) => [p.name, p.default]));
    e.init(canvas, { params, assets: {} });
    expect(() => {
      e.dispose();
      e.dispose();
    }).not.toThrow();
  });
});
```

## Rules for headless safety

- WebGL / three / OGL / cobe effects: happy-dom has **no real WebGL context**, so guard `frame` (and any GL call) to no-op when the context is null, e.g. `if (!this.gl) return;` or `const ctx = canvas.getContext('webgl2'); if (!ctx) return;` inside `init`. The test asserts no-throw, so a guarded effect passes headlessly. Real rendering is verified visually via cmux in Plan 3.
- Pointer effects: implement `onPointer(x, y)` and keep state; do not assume it is called before the first `frame`.
- DOM/R3F effects: implement `mount(host, opts)` to build the subtree; `dispose()` must remove it and detach listeners. Still export a `create<Name>Effect()` factory and a manifest so the conformance test runs.
- `dispose()` must be safe to call twice (null out refs, guard re-entry).
- Manifest `redistribution` per the synthesis beat: ok (regent/cobe/motion-core/paper) | personal-only (unlumen/spell) | reimplemented (casberry/ascii).
