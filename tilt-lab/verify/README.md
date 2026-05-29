# tilt-verify

A diff-aware, browser-driven functional verification harness for the tilt-lab
playground. It drives a real Chromium (via Playwright) against the running dev
server and reports pass/fail per functional check, per effect.

## Scope: functional truth only

This tool answers functional questions, not aesthetic ones:

- Does clicking an effect actually add a layer to the stack?
- Does the preview surface paint real pixels (not blank)?
- Do the param controls respond to real user input?
- Are frame times sane (no sustained long frames)?
- Are there console errors or uncaught page errors?

Visual and aesthetic truth ("does it look right / match the original") stays
with human-reviewed screenshots. This tool never claims an effect looks correct,
only that it is functionally alive.

## Usage

The dev server must be running (`npm run dev`, serves http://localhost:5180).

```sh
npm run verify                 # verify only effects changed in the working tree (git diff)
npm run verify -- --all        # verify every effect in the catalog
npm run verify -- gradient swirl   # verify specific effect ids
npm run verify -- --effect halo    # same as a bare id, repeatable
npm run verify -- --json       # machine-readable JSON output
npm run verify -- --headed     # run with a visible browser window (debugging)
npm run verify -- --url http://localhost:1234   # point at a different dev URL
npm run verify -- --help
```

Exit code is non-zero if any check fails, so it slots into CI or a pre-commit gate.

## How scope is chosen

1. Explicit ids (`gradient swirl` or `--effect gradient`) win.
2. `--all` forces the full catalog.
3. Otherwise it reads `git diff` (staged + unstaged + untracked):
   - changes under `runtime/effects/<id>/` -> verify just those effects,
   - changes to `app/` or the runtime shell -> verify the whole catalog,
   - no relevant changes -> verify the whole catalog.

## The five checks

| Check | What it proves | How |
|---|---|---|
| `add-layer` | The effect can be added to a stack | Clicks its browse-grid card, confirms the layer count grows |
| `canvas-paint` | The render surface is non-blank | Screenshots the preview, decodes the PNG, checks luminance spread / distinct colors |
| `param-interaction` | A control is wired to state | Drives the first param with a REAL input (fill/click/select), confirms the value reflects |
| `perf-frames` | Frame timing is sane | Samples ~1s of `requestAnimationFrame` deltas, flags sustained long frames |
| `console-clean` | No runtime errors | Captures `console.error` + uncaught page errors across the whole run |

Notes:

- Effects with `layerRole: "post"` are seeded with a base background first, so the
  post-process pass has real pixels to operate on.
- Effects that declare `requiredAssets` (images, depth maps, textures) skip the
  `canvas-paint` check, since the playground's quick-add does not provide assets.
  Their other checks still run.
- The harness is resilient to dev-server hot-reloads (HMR): if the page reloads
  mid-run, the effect is retried once.
- A preflight confirms the playground mounts before testing; if the dev bundle is
  broken (a module 500s and React never renders), it fails fast with a clear
  message instead of a wall of timeouts.

## Layout

```
verify/
  cli.mjs            entry point + arg parsing + reporting + preflight
  lib/
    catalog.mjs      reads runtime/effects/*/manifest.json
    git-diff.mjs     maps the working-tree diff to changed effect ids
    checks.mjs       the five functional checks, run via Playwright
    png.mjs          minimal PNG decoder + pixel stats (non-blank detection)
```

No external services. Playwright + Chromium are the only added dependencies.
