---
name: tilt-lab Image/Video media layer + post-pipeline fix (the missed capability)
description: Added the user-supplied media background (image/video upload) the source tools had and I'd dropped, plus fixed the post-process pipeline so a post effect actually samples the layers beneath it. Verified in Chrome - ASCII now asciifies a Media background.
type: project
relates_to: [session_2026-05-29_tilt-lab-asset-gap-FAILURE.md, session_2026-05-29_tilt-lab-FUNCTIONAL-COMPLETE.md, feedback_tilt_lab_fidelity_mandate.md]
---

Collaborator: Jonah. 2026-05-29. User caught a real miss: the source tools (ascii-magic, motion-core image effects) let users UPLOAD images/videos as the content a post-process shader acts on; a post effect over an empty stack does nothing. I never gave a way to supply media. Fixed.

## What I built
1. `file` ParamType (types.ts + manifest.ts PARAM_TYPES) + ParamControls `<input type=file accept=image/*,video/*>` -> creates an object URL passed to setParam.
2. `media` effect (runtime/effects/media/, id "media", name "Image / Video", layerRole BACKGROUND): params source(file)/fit(cover|contain)/opacity. Loads the URL as an Image; on error falls back to a looping muted video. Cover/contain draw each frame (video = current frame). Headless-guarded. Default bundled sample (assets/sample.png + assets.ts -> effectAssets.media.source) so it renders real content out-of-box; user upload overrides it.
   - BUG fixed during validation: init used `params.source ?? assets.source` but the file param defaults to "" (not null) so `??` returned "" and the sample never loaded. Changed to `||`.
3. POST-PIPELINE FIX (compositor.renderFrame): for a Canvas2D `post` layer, composite the lower layers' canvases into its OWN canvas before frame() (drawImage, guarded to 2D - WebGL posts own their input, getContext('2d') returns null -> no-op). My earlier per-layer-canvas rework had dropped this, so ascii/halftone (scene-transforming posts) had no input. ascii expects exactly this ("runtime composites layers beneath into this effect's canvas before frame()").
4. Registered media in index.ts (+ effect-assets). Catalog now 26 (25 requested + media, the user-requested capability).

## Verified in Claude-in-Chrome
- Media renders the real sample image (cover-fit) + source/fit/opacity controls + Choose File upload.
- ASCII added ON TOP of Media -> visibly renders ASCII characters following the image luminance (denser in dark regions). The post effect now transforms real content. THIS is what "a post shader does nothing alone" needed.
- Note: chrome MCP file_upload is blocked ("Not allowed") so I validated via the default sample; the upload control is present + wired for the user.

## Why it mattered (self-analysis)
I'd treated post effects as if they'd have content; they need a source. The originals' core UX (upload media) was dropped and I didn't catch/respect it. "Leave nothing out" includes capabilities, not just params.

## Files
- runtime/types.ts, runtime/manifest.ts, app/src/components/ParamControls.tsx, runtime/effects/media/{index.ts,manifest.json,index.test.ts,assets.ts,assets/sample.png}, runtime/effect-assets.ts, runtime/index.ts, runtime/compositor.ts
