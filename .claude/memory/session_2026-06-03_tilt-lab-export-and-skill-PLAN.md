---
name: PLAN + TCC BLOCKER - tilt-lab self-contained export package + "open tiltlab" fuzzy skill
description: Jonah approved two equal-value builds (portable embed-kit export so a tilt-lab stack renders when pasted into ANY repo; a fuzzy-trigger skill to launch tilt-lab from prompts like "open tiltlab"/"build a tilt"/"shader wizard"). Build BLOCKED mid-start by macOS Full Disk Access (TCC) loss - harness Read/Edit/Write + bash content-reads of pre-existing files fail "Operation not permitted"; new-file writes still work. Full design captured here so resume is mechanical once FDA restored.
type: project
relates_to: [handoff_2026-05-24_sidecoach_taste_validator_tcc_blocked.md, session_2026-06-01_no-flicker-incremental-params.md, feedback_debugging_trace_first.md]
---

Collaborator: Jonah. 2026-06-03.

## What Jonah asked for (both equal priority)
1. Make tilt-lab's export a real SELF-CONTAINED package + paste-ready snippet, so the "audition shader in tilt-lab -> paste export into Claude -> Claude retrofits into a hero background" workflow holds up when the hero lives in a DIFFERENT repo (today the export is just a config JSON, inert without the runtime bundle).
2. Add Claude-friendly FUZZY commands to open tilt-lab: "open tiltlab", "open tilt lab", "build a tilt", "shader wizard", etc.

## BLOCKER (why nothing was implemented this turn)
macOS TCC / Full Disk Access was lost by the Claude Code harness mid-session (same failure mode as handoff_2026-05-24). Precise capability map probed this session:
- Harness Read/Edit/Write tools: FAIL (EPERM).
- bash `ls` / `pwd` / `cd`: OK.
- bash content-read (sed/cat) of PRE-EXISTING files under ~/Documents (source AND .claude/memory/MEMORY.md): FAIL "Operation not permitted".
- bash create NEW file + read it back: OK. Writes to /tmp and into repo: OK.
Net: cannot read existing source -> cannot safely EDIT existing files (export.ts, TopBar.tsx, runtime/index.ts). CAN create brand-new files (so this beat + the new skill file are writable). Earlier in THIS session reads worked, so the fault is intermittent.
FIX (user action, cannot self-perform): System Settings > Privacy & Security > Full Disk Access -> enable for the terminal/Claude Code app (toggle off/on if already listed), restart the session. Then resume per below.

## Facts already gathered (verified earlier this session, before the block)
- Dev server: `cd tilt-lab && npm run dev` -> Vite on port 5180. (Watch the NODE_OPTIONS shim - see session_2026-05-31_node-options-shim-fix.md.)
- Self-contained bundle exists: `dist/tilt-runtime.js` (ESM, built by build.js from runtime/index.ts; assets inlined as data URLs).
- runtime/index.ts EXPORTS: effectFactories (Record<string,EffectFactory>), builtinManifests, registerBuiltins(), defineEffectElement, defineStackElement, setStackFactory, Compositor, PointerTracker, validateStack, orderLayers, effectAssets, types.
- Current export (app/src/lib/export.ts): copyStackConfig/downloadStackConfig/serializeStackConfig/buildStackConfig emit `tilt-lab/stack` v1 JSON {format,version,layers:[{effectId,layerRole,params,blendMode,enabled,opacity}]}.
- `<tilt-stack>` element (runtime/compositor.ts ~303-329, TiltStackElement): reads attribute `config-src`, FETCHES that URL, news a Compositor(this, stackFactory), setLayers, RAF loop. NO prefers-reduced-motion guard in its loop (element.ts DOES guard; the stack path does not - accessibility gap for a hero background).
- `<tilt-{effectId}>` per-effect element (runtime/element.ts): params as HTML attrs, ResizeObserver + reduced-motion already handled.
- TopBar.tsx is the export UI (calls the export lib). Could not read its current contents (TCC).
- New skill location: claude/skills/tilt-lab/SKILL.md (no tilt-lab skill exists yet). ~/.claude/skills is a real dir; confirm install.sh wiring (symlink vs copy) when FDA back - install.sh unreadable now.

## DESIGN - Deliverable 1: self-contained / paste-anywhere export
Root problem: export ships the recipe (config JSON), not the meal; `<tilt-stack>` needs a hosted URL (config-src) + the runtime. Make a paste-ready artifact that needs neither hosting nor hand-wiring.

A. runtime/index.ts - add exported helper `mountStack(host, config, opts?)`:
   - registerBuiltins() (make idempotent / guard double-register), new Compositor(host, effectFactories), c.setLayers(config.layers).
   - reduced = opts?.respectReducedMotion !== false && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; if reduced -> c.renderFrame(0); return ()=>c.clear(). Else RAF loop; return disposer ()=>{cancelAnimationFrame; c.clear()}.
   - This closes the stack-path reduced-motion gap (seam 2) for the embed route and removes the fetch/hosting requirement (inline config).
B. app/src/lib/export.ts - add `buildEmbedSnippet(layers)` -> self-contained HTML+module-script string:
   - a positioned host div (position:absolute; inset:0; z-index:0; pointer-events:none) + `<script type="module">import { mountStack } from './tilt-runtime.js'; mountStack(prevEl, <INLINED stack config JSON>);</script>`
   - leading comment: "1) copy dist/tilt-runtime.js into your project  2) paste this where you want the effect".
   - add `copyEmbedSnippet(layers)` (clipboard) - THE key new affordance for the Claude-paste loop - and `downloadEmbedKit(layers)` (downloads tilt-lab-embed.html + tilt-lab-stack.json; bundle referenced, user copies dist/tilt-runtime.js).
C. TopBar.tsx - add an "Embed" / "Copy embed" action next to the existing export, wired to copyEmbedSnippet.
D. Tests: export.test.ts -> buildEmbedSnippet inlines layers + contains mountStack + bundle instruction. runtime test -> mountStack reduced-motion renders single frame (no loop); normal path loops; returns working disposer. Then `npm test` + `npm run typecheck` green, and rebuild `npm run build` so dist/tilt-runtime.js exports mountStack.
Verify: actually paste the snippet into a throwaway hero in test-site-1, serve, screenshot - confirm the effect renders as background behind content (what-you-saw-is-what-renders).

## DESIGN - Deliverable 2: fuzzy "open tiltlab" skill (claude/skills/tilt-lab/SKILL.md)
- Frontmatter description carries the triggers so the model auto-invokes: "open tiltlab", "open tilt lab", "build a tilt", "shader wizard", "audition a shader", "shader background", "spin up tiltlab", "explore shaders", "tilt a hero", "tilt-lab".
- Body instructs Claude to: (1) start `cd tilt-lab && npm run dev` in BACKGROUND (port 5180; mind NODE_OPTIONS shim); (2) open http://localhost:5180 in browser (cmux surface or chrome MCP) + screenshot to confirm; (3) explain the loop explore/tune -> Copy embed -> paste back -> Claude retrofits; (4) ENCODE THE RETROFIT CONTRACT: vendor dist/tilt-runtime.js and NEVER reimplement the shader (fidelity = same runtime); use mountStack / `<tilt-stack>` inline config; position as background (absolute inset-0, z-index under content, pointer-events per effect); honor reduced-motion; match host tokens; (5) `npm run build` to refresh the bundle if stale.
- After writing: confirm install wiring (symlink the new skill dir into ~/.claude/skills if install.sh does per-skill symlinks), and that the description triggers (smoke-test by typing a trigger phrase).

## Resume checklist (once FDA restored)
1. Read this beat. 2. Implement Deliverable 1 A->D, test+typecheck+build green, browser-verify the embed in test-site-1. 3. Implement Deliverable 2 skill, verify trigger + launch. 4. Reconcile MEMORY.md index (could not be updated this turn - index file was unreadable under TCC). 5. Commit (branch first; do not self-attribute; name Jonah in notes).

## Files (planned, none yet modified)
- tilt-lab/runtime/index.ts (add mountStack) [EDIT - blocked]
- tilt-lab/app/src/lib/export.ts (buildEmbedSnippet/copyEmbedSnippet/downloadEmbedKit) [EDIT - blocked]
- tilt-lab/app/src/components/TopBar.tsx (Embed action) [EDIT - blocked]
- tilt-lab/app/src/lib/export.test.ts + a runtime mountStack test [EDIT/NEW]
- claude/skills/tilt-lab/SKILL.md [NEW - writable now]
