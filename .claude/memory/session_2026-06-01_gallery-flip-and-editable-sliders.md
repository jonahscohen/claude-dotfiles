---
name: gallery/slideshow flip + multi-image spread + speed; click-to-type on all sliders
description: Two user tasks. (1) glass-slideshow + infinite-gallery rendered upside down (flipY:false, the fake-3d bug) -> flipY:true; gallery now shows multiple offset images via a golden-angle spread param (default 1.5, 0=centered); gallery speed lowered (advance *10 -> *4). (2) the shared Slider readout is now CLICK-to-type (was double-click), and the channel opacity % is click-to-type too. All Chrome-verified.
type: project
relates_to: [session_2026-06-01_color-picker-transparency.md, session_2026-06-01_interaction-surfacing-and-teardown.md]
---

Collaborator: Jonah. 2026-06-01.

## Task 1 - glass-slideshow + infinite-gallery
- **Upside down**: both created textures with `flipY: false` (the exact fake-3d-image bug; WebGL texture origin is bottom-left). Set `flipY: true` -> images render upright. Chrome-verified: gallery shows an upright Santorini scene; slideshow shows an upright sunset pier.
- **"Multiple offset images at once" (gallery)**: planes were all positioned dead-centre (x=0,y=0), so only the nearest showed. Added a `spread` option: each plane gets a golden-angle unit offset (cos/sin of i*2.39996) scaled by `spread`; mesh.position.set(off*spread, ..., z). New `spread` manifest param ("Image spread", default 1.5, min 0 max 4 step 0.1); setParam repositions planes live; 0 = single-file centred tunnel. Chrome-verified: multiple images fan out around centre.
- **Speed too fast (gallery)**: advance was `scrollVelocity * delta * 10 * speed`; lowered the baseline 10 -> 4. The `speed` param (0-5) still scales up.
- PlaneData gained `offset: [number,number]`. tsc 0; gallery+slideshow unit tests still green (param-count assertions unaffected).

## Task 2 - click-to-type on all sliders ("big task")
- **Shared Slider** (app/src/components/controls/Slider.tsx) was edit-on-DOUBLE-click; a single click started a scrub. Changed so a CLICK (press+release with no drag) opens the type-in editor, while a DRAG (> DRAG_THRESHOLD=3px) still scrubs. onPointerUp opens the editor when !dragged. Removed onDoubleClick. Guarded setPointerCapture/hasPointerCapture in try/catch (jsdom lacks them). Updated the 3 controls.test.tsx Slider tests from fireEvent.doubleClick -> pointerDown+pointerUp. 19/19 controls tests green.
- **Channel opacity** (LayerStack) was a raw range + non-editable `<output>` "100%". Added click-to-type on the percentage readout (local edit state in ChannelCard; commits parsed/100, clamped 0..1). New .channel__opacity-edit/.channel__opacity-readout CSS.
- NOT touched: the ColorField alpha fader has no numeric readout (it's a fader; the hex shows alpha), so "click the number to type" doesn't apply.
- Chrome-verified: clicked a param slider value (speed) -> typed 3 -> commits 3.0 + thumb moves; clicked channel opacity "100%" -> typed 55 -> 55% + fader moves.

## Verify
tsc 0, 239 tests. Both tasks Chrome-verified (tabId 1827119115).
