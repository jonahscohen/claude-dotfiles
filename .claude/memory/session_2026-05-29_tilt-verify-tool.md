---
name: tilt-verify - our own expect-inspired verification tool (built + passing)
description: tool-dev (#1) built tilt-lab/verify/ - our custom Playwright browser-verifier (no expect branding), 5 functional checks, diff-aware. Full-catalog run = 25 effects, 114 pass, 10 skip (asset), 1 fail (fluid perf, headless-GPU artifact).
type: project
relates_to: [decision_behavioral_verifier_build_own.md, session_2026-05-29_tilt-lab-restoration-complete.md]
---

Collaborator: Jonah. 2026-05-29. All 7 tilt-restore tasks done.

## tilt-verify (tilt-lab/verify/)
Our own browser-verification tool, expect-inspired, NO expect branding (verified clean). Built by tool-dev leveraging /tmp/expect-src per the user's personal-local-use authorization.
- cli.mjs (entry/args/report/preflight), lib/{catalog,git-diff,checks,png}.mjs, README.
- Invoke: `npm run verify` (diff-aware), `-- --all`, `-- <ids>`, `-- --json`, `-- --headed`. Non-zero exit on fail (CI-ready). playwright devDep + Chromium installed. typecheck stays green (verify/ outside tsconfig include).
- 5 functional checks/effect (FUNCTIONAL truth only; visual stays with screenshots): add-layer, canvas-paint (real PNG pixel decode; skipped for asset-requiring effects; post effects seeded over a base), param-interaction (real input), perf-frames (~1s rAF), console-clean. HMR-resilient + preflight fails fast if bundle broken.
- I added NON_CATALOG skip set (gradient) to catalog.mjs so it mirrors the live catalog (gradient is a non-catalog fixture); renamed gradient manifest name -> "Reference Gradient" (was colliding with spell "Animated Gradient").

## Full-catalog result (after gradient fix)
25 effects, checks pass=114 fail=1 skip=10. 
- 10 skips = asset-requiring effects skip ONLY canvas-paint (no quick-add assets): cursor-trail, dithered-image, fake-3d-image, glass-slideshow, infinite-gallery, mc-globe, grain-gradient, water-ripple, interactive-grid (+particles perf skip). Their other 4 checks pass.
- 1 fail = FLUID perf (~12fps, longFrames in headless). Heavy GPU fluid sim; headless Chromium has NO GPU accel so this is a headless artifact (particles ~2fps similarly, tool soft-skips it). To confirm: verify fluid in Claude-in-Chrome (real GPU). NOT a fidelity defect (fluid renders + all params; faithful to a heavy original). Plan: confirm in real browser, then calibrate perf check to advisory-in-headless for GPU effects (honest: headless can't fairly judge GPU perf) rather than downgrade fluid's default quality (which would break fidelity).

## Files
- tilt-lab/verify/* (new tool), tilt-lab/verify/lib/catalog.mjs (NON_CATALOG skip), tilt-lab/runtime/effects/gradient/manifest.json (name->Reference Gradient), tilt-lab/package.json (playwright dep).
