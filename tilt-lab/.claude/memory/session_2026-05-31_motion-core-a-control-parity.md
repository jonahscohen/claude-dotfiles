---
name: motion-core lane-8a control parity (parity-mc-a)
description: Added image-upload file params to the 4 image-based motion-core effects; halo + mc-globe already complete
type: project
relates_to: [session_2026-05-31_motion-core-b-control-parity.md]
---

# motion-core lane-8a control-completeness pass (parity-mc-a)

Collaborator: Jonah. Graphics engineer agent reporting to team-lead.

## Scope
6 lane-8a motion-core effects: dithered-image, fake-3d-image, glass-slideshow, mc-globe, halo, infinite-gallery. Goal: COMPLETE control-surface parity vs the originals (match or exceed), control-by-control. Shaders were verbatim-correct from the prior pass and were NOT touched.

## Source of truth
- docs/superpowers/tilt-lab-recon/lane-8a-motion-core.md (verbatim shaders + prop tables) and lane-8b.
- WebFetch of motion-core.dev/docs/dithered-image + upstream DitheredImage.svelte CONFIRMED the recon prop tables exactly (dithered-image surface = ditherMap select, pixelSize, threshold, color, backgroundColor, + `src` image upload). Recon is accurate; treated as authoritative.

## Audit result: the one consistent gap was IMAGE UPLOAD
The prior pass wired bundled `opts.assets.*` defaults but never exposed an upload CONTROL. The runtime DOES support a `"file"` param type (the `media` effect uses it; the app renders a FileDrop control for it). The 4 image-based effects had `requiredAssets` but no `file` param, so users could not upload their own images - the exact "asset upload" feature the mandate flagged.

Everything else was already complete or EXCEEDED the original:
- glass-slideshow already exposes every shader uniform (speedMultiplier, colorEnhancement, bubbleClarity, edgeGlow, liquidFlow) + index/transitionDuration/autoplay/autoplayInterval + power3.inOut ease.
- mc-globe exposes the full Fresnel rim config + full atmosphere config (decomposed into individual color/range params) + display transform (scale/offset/rotation) + pointCount/pointSize/landPointColor/autoRotate/lockedPolarAngle. Exceeds the recon table.
- infinite-gallery decomposes fadeSettings/blurSettings objects into individual range params + speed/visibleCount/autoplay.
- halo: all 8 procedural params present, no assets/presets in original. Complete, untouched.

## What was ADDED (the missing upload controls)
- **dithered-image**: `src` file param. init prefers uploaded URL over bundled asset; setParam('src') loads it.
- **fake-3d-image**: `colorSrc` + `depthSrc` file params. init prefers uploads; setParam handles both.
- **glass-slideshow**: image0..image3 file params (4 slide-upload slots). Slot count floored at UPLOAD_SLOTS=4 so each upload has a slide; setParam('imageN') loads slot N (regex-dispatched); init merges param-uploads over bundled assets per slot.
- **infinite-gallery**: image0..image5 file params (6 tile-upload slots). Slot count floored at UPLOAD_SLOTS=6; setParam('imageN') loads tile N; init merges param-uploads over bundled assets per slot.

mc-globe + halo: no upload added (original land-texture is a fixed bundled mask, not user-uploaded; halo is fully procedural). The globe marker/tooltip/focus-on data-viz layer remains intentionally out of the Effect contract per recon.

## Why / How
Why: completeness mandate - image-based originals let users supply their own images; the ports only shipped bundled samples. How: added `{name, type:"file", default:""}` params (placed first, matching the `media` convention) and wired init/setParam to prefer a non-empty uploaded object-URL string over `opts.assets[key]`, falling back to the procedural texture. UI is manifest-driven so the FileDrop control appears automatically.

## Verify
- `cd tilt-lab/app && npx tsc --noEmit` -> 0.
- `cd tilt-lab && npm test` -> 43 files / 164 tests green. Added upload tests to all 4 image effects (dithered 5, fake-3d 4, glass 4, infinite 4 = 17 in those files), each asserting the file param(s) exist and setParam('imageN'/'src') + frame run without throwing.

## Files touched
- runtime/effects/{dithered-image,fake-3d-image,glass-slideshow,infinite-gallery}/manifest.json (added file params)
- runtime/effects/{dithered-image,fake-3d-image,glass-slideshow,infinite-gallery}/index.ts (init + setParam upload wiring; UPLOAD_SLOTS constants)
- runtime/effects/{dithered-image,fake-3d-image,glass-slideshow,infinite-gallery}/index.test.ts (upload coverage)
- halo + mc-globe: verified complete, untouched.
