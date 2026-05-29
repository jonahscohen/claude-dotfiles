# tilt-lab acquisition - shared brief

You are an acquisition teammate for **tilt-lab**. Your job: port the verbatim effects your recon report captured into the tilt-lab `Effect` contract as framework-agnostic modules. Work ONLY inside `tilt-lab/runtime/effects/<id>/` for your lane's effects (plus `tilt-lab/runtime/lib/` if your task says so).

## Read first (in order)
1. `docs/superpowers/tilt-lab-recon/RECON-BRIEF.md` - the contract + layer roles.
2. Your lane report: `docs/superpowers/tilt-lab-recon/lane-<N>-*.md` - the verbatim source you are porting.
3. `tilt-lab/runtime/types.ts` - the exact `Effect` interface (note the OPTIONAL `onPointer` + `mount`).
4. `tilt-lab/runtime/effects/gradient/` - the REFERENCE effect (index.ts + manifest.json + index.test.ts). Copy its shape.
5. `tilt-lab/runtime/effects/_TEMPLATE.test.ts.md` - the conformance test every effect must pass.

## The contract
```ts
interface Effect {
  init(canvas, { params, assets }); frame(t); resize(w, h); setParam(key, value); dispose();
  onPointer?(x, y);            // pointer-driven effects only
  mount?(host, { params, assets }); // DOM/R3F effects render into host instead of canvas
}
```
The web-component wrapper drives these. **Effects DO NOT own their own RAF loop** - render statelessly from `t`. For libraries that own a RAF (cobe, OGL `Scene`s, R3F `useFrame`): drive their `update()`/`tick()` from `frame(t)` and disable their internal loop. For DOM + Framer-Motion effects (cursor-trail): implement `mount(host)` + `onPointer(x,y)` instead of canvas drawing.

## Renderers available
`three`, `ogl`, `cobe` are installed - import them. Raw WebGL and Canvas2D are also fine. Use whatever the recon report's source used.

## HEADLESS SAFETY (required - tests run in happy-dom with NO WebGL)
Guard GL so the conformance test passes headlessly:
```ts
init(canvas, opts) {
  const gl = canvas.getContext('webgl2'); // or 'webgl' / '2d'
  if (!gl) { this.dead = true; return; }  // happy-dom returns null
  ...
}
frame(t) { if (this.dead) return; ... }
```
The test only asserts no-throw; real rendering is verified visually via cmux later.

## Per effect (for each canonical effect named in your task; SKIP dups / out-of-scope)
Create three files under `tilt-lab/runtime/effects/<id>/`:
- `index.ts` - export `create<Name>Effect(): Effect`, porting the VERBATIM shader/source from your report.
- `manifest.json` - id, name, category, layerRole, params (from the report), requiredAssets, origin (URL), license, attribution, redistribution (per the synthesis: ok for regent/cobe/motion-core/paper; personal-only for unlumen/spell; reimplemented for casberry/ascii), tags. It must pass `validateManifest`.
- `index.test.ts` - copy `_TEMPLATE.test.ts.md`, fill `<id>`/`<Name>`.
- Any required asset goes in `tilt-lab/runtime/effects/<id>/assets/` and is listed in `requiredAssets`.

## Rules
- DO NOT edit `tilt-lab/runtime/index.ts` (the shared registry) - team-lead registers all effects centrally afterward to avoid write conflicts.
- DO NOT commit and DO NOT write beats - just create files, run tests, and report. Team-lead handles commits.
- Use hyphens, never em dashes (a repo hook blocks them).

## Verify before marking your task complete
Run (from repo root): `cd tilt-lab && npx vitest run runtime/effects/<id>` for each effect you built. All green required. Then `cd tilt-lab && npx tsc --noEmit` to confirm types. Mark your task complete via TaskUpdate, claim the next, and when none remain SendMessage team-lead a summary (effects built, renderer used, any effect you could not port and why) and go idle.
