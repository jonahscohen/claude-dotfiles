---
name: tilt-lab self-contained embed export (mountStack + buildEmbedSnippet + Copy-embed button)
description: Deliverable 1 of 2 (Jonah, 2026-06-04). Made tilt-lab's export portable - a paste-anywhere embed snippet that renders the exact previewed stack in ANY project, not just an inert config JSON. New runtime mountStack() entry point (inline config, no hosting, reduced-motion guard), buildEmbedSnippet/copyEmbedSnippet/downloadEmbedSnippet in export.ts, a Copy-embed button (lucide code-xml icon) in TopBar. tsc clean, 254 tests pass (8 new), bundle re-exports mountStack. Browser verification pending.
type: project
relates_to: [session_2026-06-03_tilt-lab-export-and-skill-PLAN.md, session_2026-06-01_no-flicker-incremental-params.md]
---

Collaborator: Jonah. 2026-06-04. Implements deliverable 1 of the plan in session_2026-06-03_tilt-lab-export-and-skill-PLAN.md (built after Full Disk Access / TCC was restored).

## Problem
Old export emitted only a `tilt-lab/stack` v1 config JSON - inert without the runtime, and the `<tilt-stack config-src>` element needed that JSON hosted at a fetchable URL. So "paste your tilt-lab export into Claude and retrofit it into a hero background" did not hold up across repos.

## What shipped
- runtime/index.ts: new `mountStack(host, config, opts?)` + `MountStackOptions`. Registers builtins (idempotent), news a Compositor over `effectFactories`, setLayers, runs a RAF loop - UNLESS `prefers-reduced-motion: reduce` (then paints one static frame via renderFrame(0)). Returns a disposer (cancels rAF + compositor.dispose()). `respectReducedMotion: false` forces animation. This closes the reduced-motion gap that `<tilt-stack>`'s loop has (element.ts guards; the stack element does not). Imports Compositor + LayerConfig locally (Compositor was previously only re-exported).
- app/src/lib/export.ts: `buildEmbedSnippet(layers, {runtimeUrl?, className?})` returns a self-contained HTML block: an absolutely-positioned background `<div class="tilt-bg" style="...inset:0; z-index:0; pointer-events:none">` + a CLASSIC `<script>` that captures the host via `document.currentScript.previousElementSibling`, inlines the config as `var config = {...}`, then `import(runtimeUrl).then(m => m.mountStack(host, config))`. Classic (not module) script is deliberate: `document.currentScript` is null in ES modules. Plus `copyEmbedSnippet` (clipboard) and `downloadEmbedSnippet` (.html). Constants: EMBED_SNIPPET_FILENAME, DEFAULT_RUNTIME_URL='./tilt-runtime.js', DEFAULT_EMBED_CLASS='tilt-bg'.
- app/src/components/icons.tsx: added `CodeXmlIcon` (lucide code-xml, path data verbatim).
- app/src/components/TopBar.tsx: new "Copy embed snippet" icon button (CodeXmlIcon, Check on success) next to the copy-config button, with its own embedCopied state + 1.2s reset; disabled until layers exist.

## Verified
- `npm run typecheck` clean. `npm test` = 254 passed (46 files). New: 5 buildEmbedSnippet tests (inlines JSON not config-src, contains mountStack(host, config), classic-not-module script, custom runtimeUrl/className, JSON round-trips) + 3 mountStack tests (reduced-motion = no rAF; motion = 1 rAF + disposer cancels; respectReducedMotion:false overrides). mountStack tests use an EMPTY stack so no WebGL effect inits in happy-dom.
- `npm run build` -> dist/tilt-runtime.js now exports `mountStack` (confirmed `aR as mountStack` in the export map).
- The jsdom "HTMLCanvasElement.prototype.getContext/toDataURL not implemented" lines in test output are PRE-EXISTING noise from ThumbnailPreview.tsx, not from these changes; all 46 files pass.

## Browser-verified (Chrome, 2026-06-04)
- (a) Embed renders END-TO-END: wrote a throwaway dist/embed-verify.html with the EXACT buildEmbedSnippet shape (classic script -> currentScript host -> inline aurora config -> import('./tilt-runtime.js') -> mountStack), served dist/ on :5191, loaded it. The rebuilt bundle rendered the Aurora WebGL stack full-bleed as the hero background with the "Aurora, embedded" content layered above it (z-index:1 over the z-index:0 host). Proves bundle export + inline-config snippet + mountStack + background layering all work together. (Temp page since removed; dist/ is gitignored anyway.)
- (b) Copy-embed button: ran `npm run dev` (:5180). Top bar shows 4 buttons (plus / download / copy / new code-xml </>). Export trio is correctly DISABLED with 0 layers; armed an Aurora layer -> all enabled. Clicked the </> button (browser_batch click+zoom for tight timing) -> icon swapped to the check = handleCopyEmbed -> copyEmbedSnippet fired and reported success. Interactive proof complete.

## Deliverable 2 (open-tiltlab skill) - DONE this session too
- claude/skills/tilt-lab/SKILL.md created (canonical) + mirrored to ~/.claude/skills/tilt-lab/SKILL.md (live). Confirmed: `tilt-lab` now appears in the session's available-skills list with the fuzzy triggers (open tiltlab / build a tilt / shader wizard / audition a shader / shader background / ...). Body = launch (npm run dev :5180 -> open browser -> explain loop) + the retrofit contract (vendor dist/tilt-runtime.js, NEVER reimplement, mount via mountStack, background positioning, reduced-motion, match tokens) + bundle-rebuild note.
- Note: dist/tilt-runtime.js is GITIGNORED, so the rebuilt bundle (now exporting mountStack) is NOT committed; consumers run `npm run build`. The skill documents this. install.sh registration of the new skill under the `skills` component is a possible follow-up (canonical file is in claude/skills/, the documented source dir).

## Files touched
- tilt-lab/runtime/index.ts (mountStack)
- tilt-lab/runtime/mount-stack.test.ts (new)
- tilt-lab/app/src/lib/export.ts (embed snippet API)
- tilt-lab/app/src/lib/export.test.ts (embed tests)
- tilt-lab/app/src/components/icons.tsx (CodeXmlIcon)
- tilt-lab/app/src/components/TopBar.tsx (Copy-embed button)
- tilt-lab/dist/tilt-runtime.js (rebuilt)
