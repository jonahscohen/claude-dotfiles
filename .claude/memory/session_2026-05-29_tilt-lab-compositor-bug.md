---
name: tilt-lab Compositor rendering bug (found by visual verification)
description: The Plan-1 Compositor never sizes its canvas or calls effect.resize(), and shares one canvas across all layers - so the playground preview renders black. Found via cmux screenshot after clicking an effect. Fix = per-layer sized canvases, stacked + blend-moded, with resize + pointer forwarding.
type: project
relates_to: [session_2026-05-29_tilt-lab-ui-exec.md, session_2026-05-29_tilt-lab-foundation-exec.md]
superseded_by: session_2026-06-05_tilt-lab-consolidated.md
---

Collaborator: Jonah. 2026-05-29. Found during Plan 3 Task 9 visual verification.

## Symptom
Clicked "Animated Gradient" in the playground (real cmux click). Layer added correctly - right panel shows the layer + manifest-driven param controls (speed/colorA/colorB). But the CENTER PREVIEW stayed BLACK; the gradient did not visibly render.

## Trace (not a regression - first-time render)
PreviewCanvas mounts a runtime Compositor and RAF-pumps renderFrame(t). Compositor.renderFrame only calls effect.frame(t). It NEVER: (a) sizes the canvas drawing buffer, (b) calls effect.resize(w,h). So gradient keeps its default w=1,h=1 and fillRect(0,0,1,1) paints one pixel. Also: the Compositor shares ONE composite canvas across all non-post layers - but a canvas can hold only one context kind, so stacking a Canvas2D + a WebGL effect (or two WebGL effects) would have the 2nd getContext return null. The standalone defineEffectElement wrapper sizes correctly (ResizeObserver + syncSize + resize), but the Compositor path (used by PreviewCanvas AND tilt-stack) does not. Plan 1's Compositor was a simplistic shared-canvas stub.

## Fix (compositor rework)
Each layer gets its OWN element stacked in the host (position:absolute; inset:0; width/height:100%; mix-blend-mode per layer; z-index by order):
- canvas effects: create a canvas, init(canvas), and on resize set canvas.width/height = host client size + call effect.resize.
- mount() effects (cursor-trail): create a container div, call effect.mount(container,...).
- pointer effects: Compositor attaches a PointerTracker on the host root and calls effect.onPointer(x,y) in renderFrame for layers that implement it.
- ResizeObserver on the host root drives resize() for all layers.
Update compositor.test.ts (drop the single-composite-canvas / postInputCanvas assertions; keep init/frame/dispose ORDER tests; add a sizing test). tilt-stack + PreviewCanvas consume the new Compositor unchanged in signature.

## SECOND finding (visual verification, after the compositor fix)
After the compositor rework + size-before-init, Canvas2D RENDERS (gradient confirmed showing in preview). But WebGL/OGL effects (tested Aurora raw-WebGL2 + Lava Lamp OGL) ADD correctly with full manifest-driven param controls and ZERO console errors, yet DO NOT visibly paint (preview stays black). Size-before-init did not fix it -> not a sizing/ordering issue.
DIAGNOSIS - FIRST HYPOTHESIS WAS WRONG (verified per debugging protocol): I guessed the effects create their own canvas. CHECKED lava-lamp + aurora source: both correctly use the PROVIDED canvas (lava-lamp `new Renderer({ canvas, alpha, dpr })`; aurora getContext on the provided canvas + sets gl.viewport in resize). So that is NOT the cause.
CONCRETE SUSPECT found in lava-lamp init: it PROBES `canvas.getContext('webgl2') || canvas.getContext('webgl')` (which creates the context) and THEN `new Renderer({ canvas })` makes OGL call getContext('webgl2') AGAIN. Per WebGL spec the 2nd call returns the SAME context but SILENTLY IGNORES OGL's requested context attributes (alpha/premultipliedAlpha/antialias/depth). That attribute mismatch (and the probe-created context) is a strong candidate for blank output. Likely repeated across the OGL effects (the headless-guard probe pattern from the brief). aurora is raw WebGL2 (single getContext) so its blankness may have a DIFFERENT cause - needs its own look.
ROOT CAUSE NOT DEFINITIVELY CONFIRMED - needs live per-effect GL debugging (check gl.getError, whether frame() is actually invoked, clearColor/alpha, dpr/viewport). Do NOT assume a single fix.
SCOPE: ~18 WebGL/OGL effects, ported by different agents. Canvas2D effects (gradient confirmed, swarm, ascii) unaffected.

## ROOT CAUSE FOUND + FIXED (live console debugging, 2026-05-29)
Instrumented lava-lamp with console.logs (sanctioned debug path) + read via cmux console list. Evidence: `resize {w:725, h:1}` and `frame1 {err:0, bw:1450, bh:2}` - GL error 0 (rendering fine!) but into a 2px-tall canvas. Host clientHeight read as ~0.
THE BUG WAS MINE (in the compositor rework): `if (!this.root.style.position) this.root.style.position='relative'`. PreviewCanvas's host (.preview-canvas) fills its parent via CSS `position:absolute; inset:0`; forcing inline `position:relative` clobbered that, collapsing the host to ~0 height (its children are absolute) -> h=1 -> 2px canvas -> invisible. Systemic: hit EVERY layer (Canvas2D + WebGL).
FIX: only set relative when computed position is `static`/empty (never clobber absolute/relative/fixed). After fix: lava-lamp (OGL) resize {w:725,h:879}, renders orange metaball blobs full-screen; aurora (raw WebGL2) renders full blue/cyan aurora. Both VISUALLY CONFIRMED via cmux screenshot. My earlier double-getContext hypothesis was a red herring for the blankness (though still worth tidying). 123 tests green, tsc clean.
LESSON: classic debugging-protocol win - instrument + read evidence (h:1) beat theorizing (I'd guessed own-canvas, then attribute-mismatch, both wrong). The actual cause was my own one-line position override.

## NEXT (recommended): WebGL-render compliance pass
A focused team, one agent per WebGL/OGL effect: confirm the effect constructs its renderer with the compositor-provided canvas (not a self-created one), wires frame(t)->render + resize->viewport, and VISUALLY verifies via cmux that it paints. This is real per-effect debugging + visual QA, not a single fix. The sidecoach QA gate (audit/critique/polish) runs after the effects actually render.

## Known v1 limitation (document, not fix now)
`post` layers that need to SAMPLE the composited scene beneath (ascii snapshots its own now-separate canvas) will not see lower layers in v1 - this is the long-flagged "post is the hard part". Post effects render on their own top canvas; sampling-beneath is a follow-up (render lower stack to an offscreen and feed it as the post input).
