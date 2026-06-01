---
name: preview no longer rebuilds/flickers on every param change (incremental setParam)
description: User: "does it have to flicker and reload every time i change one thing about a shader." Root cause - Compositor.setLayers always did clear() + full rebuild, and PreviewCanvas calls it on every layers change, so one param tweak tore down + re-init'd the whole stack. Fixed - setLayers now diffs; unchanged effect set/order applies param/opacity/visibility/blend changes IN PLACE via setParam + surface styles. Only structural changes rebuild.
type: project
relates_to: [session_2026-06-01_layer-order-honored.md, session_2026-06-01_gallery-flip-and-editable-sliders.md]
---

Collaborator: Jonah. 2026-06-01.

## Bug
Every change to a layer (even one slider) flickered: the effect blanked and reloaded. Cause: app/src/components/PreviewCanvas.tsx runs `compositor.setLayers(layers)` on every `layers` change, and Compositor.setLayers ALWAYS did `this.clear()` (dispose every effect + remove every surface) then rebuilt the whole stack via init(). So a param edit = full teardown + re-init of the entire composition. The effects already implement setParam for live tuning - the compositor just never used it.

## Fix (runtime/compositor.ts)
setLayers now diffs:
- `sameStructure(configs)`: same length + same effectId per index (and thus order) -> fast path.
- `applyConfigChanges`: for each layer, diff params (Object.is) and call effect.setParam(key, value) for each changed key (wrapped in try/catch so one bad param can't break the rest); update opacity/display/mixBlendMode on the surface directly; store the new config. NO dispose/init -> no flicker.
- else `rebuild(configs)`: the old clear()+build loop (only when the effect set or order changes - add/remove/reorder/swap).
Verified every effect handles its params (incl. file/asset uploads) in setParam before relying on this: infinite-gallery image(d+), glass-slideshow image* (loadSlide), fake-3d colorSrc/depthSrc, dithered src/ditherMap, media source, interactive-grid image - all present.

## Verified
- Unit (runtime/compositor.test.ts, 9 tests): new test asserts a param-only change logs `setParam:...` and NO dispose:/init: (no rebuild); another asserts a structural change (added layer) still does init + dispose. tsc 0.
- Chrome (tabId 1827119115): on a live Dithered Image, clicked pixelSize -> typed 10 -> the dither dots grew from fine to chunky blocks IN PLACE; the effect stayed rendered the whole time (no blank/reload). Flicker gone.

## Note
Presets (which change many params at once) now also apply incrementally via setParam - smoother than the old rebuild path. Structural ops (add/remove/reorder) still rebuild by design.
