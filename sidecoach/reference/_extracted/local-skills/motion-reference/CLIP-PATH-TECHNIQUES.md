---
name: Clip-Path Reveal & Masking Techniques
description: Hardware-accelerated clip-path reveals, clipped-overlay transitions, progress fills, scroll reveals, and comparison sliders from agent-skills motion library
source: https://github.com/mblode/agent-skills
source_license: MIT
type: reference
domain: motion
extracted: 2026-05-28
extracted_by: Jonah
source_note: agent-skills motion library, clip-path subset; Framer Motion concepts translated to vanilla/GSAP
---

# Clip-Path Reveal & Masking Techniques

CSS-first reveal and masking patterns built on `clip-path`. `clip-path` animates on the compositor when paired with `transform`/`opacity`, so these patterns stay at 60fps without layout thrash. Sidecoach output is library-agnostic; any Framer Motion source is translated to vanilla CSS or GSAP below.

## Source

The patterns below distilled into Sidecoach's reference layer from the agent-skills motion library. Framer Motion's `clipPath` animations map onto plain CSS transitions and GSAP tweens.

## Why clip-path over width/height

Animating `width`, `height`, or `max-height` triggers layout on every frame. `clip-path: inset(...)` clips the painted box without reflowing it, so the browser can promote the element to its own layer and animate on the GPU. Always pair with `will-change: clip-path` only for the duration of the animation, then remove it.

## inset() Reveals

A directional reveal that wipes content in from one edge. The element is laid out at full size and clipped; the transition opens the clip.

```css
.reveal {
  clip-path: inset(0 100% 0 0); /* fully clipped from the right */
  transition: clip-path 600ms cubic-bezier(0.16, 1, 0.3, 1);
}
.reveal.is-open {
  clip-path: inset(0 0 0 0); /* fully revealed */
}
```

Swap the inset edges to change direction: `inset(100% 0 0 0)` reveals upward, `inset(0 0 0 100%)` reveals from the left.

## Tab Color Transition (Clipped Duplicate Overlay)

A tab/segment whose label color flips as an indicator slides under it. Render the label twice: the base color underneath, the active color in an absolutely-positioned overlay that is clipped to the indicator's position. As the indicator moves, animate the overlay's clip so the active color is only painted where the indicator sits.

```html
<button class="tab">
  <span class="tab__base">Overview</span>
  <span class="tab__active" aria-hidden="true">Overview</span>
</button>
```

```css
.tab { position: relative; color: var(--fg-muted); }
.tab__active {
  position: absolute; inset: 0;
  color: var(--fg-active);
  clip-path: inset(0 100% 0 0); /* hidden until the indicator arrives */
  transition: clip-path 250ms cubic-bezier(0.16, 1, 0.3, 1);
}
.tab.is-active .tab__active { clip-path: inset(0 0 0 0); }
```

The duplicate must be `aria-hidden="true"` so screen readers do not announce the label twice.

## Hold-to-Delete Progress Fill

A destructive control that fills as the user holds, confirming only on completion. The fill is a clipped color overlay driven by a CSS custom property the JS ramps from 0 to 100%.

```css
.hold-delete { position: relative; overflow: hidden; }
.hold-delete__fill {
  position: absolute; inset: 0;
  background: var(--danger);
  clip-path: inset(0 calc(100% - var(--progress, 0%)) 0 0);
}
```

```js
const el = document.querySelector('.hold-delete');
let raf, start;
const DURATION = 1200;
function frame(t) {
  start ??= t;
  const pct = Math.min(100, ((t - start) / DURATION) * 100);
  el.style.setProperty('--progress', pct + '%');
  if (pct < 100) raf = requestAnimationFrame(frame);
  else el.dispatchEvent(new CustomEvent('holdcomplete'));
}
el.addEventListener('pointerdown', () => { start = null; raf = requestAnimationFrame(frame); });
el.addEventListener('pointerup', () => { cancelAnimationFrame(raf); el.style.setProperty('--progress', '0%'); });
el.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); el.style.setProperty('--progress', '0%'); });
```

Hold-to-confirm is itself an accessible alternative to a confirm dialog, but always pair it with a keyboard-reachable fallback (Enter then a second confirm) for users who cannot hold a pointer.

## Scroll Image Reveal

Reveal an image by opening its clip as it enters the viewport. Prefer the native Scroll Timeline API; fall back to IntersectionObserver.

```css
@keyframes clip-reveal {
  from { clip-path: inset(0 0 100% 0); }
  to   { clip-path: inset(0 0 0 0); }
}
.scroll-reveal {
  animation: clip-reveal linear both;
  animation-timeline: view();
  animation-range: entry 0% entry 80%;
}
```

```js
/* IntersectionObserver fallback */
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) e.target.classList.add('is-revealed');
}, { threshold: 0.2 });
document.querySelectorAll('.scroll-reveal').forEach((el) => io.observe(el));
```

## Comparison Slider (Before/After)

Two stacked images; the top one is clipped to a draggable divider. Drive the clip with a custom property updated from pointer position.

```css
.compare { position: relative; }
.compare__after {
  position: absolute; inset: 0;
  clip-path: inset(0 calc(100% - var(--split, 50%)) 0 0);
}
.compare__handle { position: absolute; top: 0; bottom: 0; left: var(--split, 50%); }
```

```js
const c = document.querySelector('.compare');
function setSplit(clientX) {
  const r = c.getBoundingClientRect();
  const pct = Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100));
  c.style.setProperty('--split', pct + '%');
}
c.addEventListener('pointermove', (e) => { if (e.buttons) setSplit(e.clientX); });
c.addEventListener('pointerdown', (e) => setSplit(e.clientX));
```

The handle must be keyboard-operable: make it a `role="slider"` with arrow-key handling and `aria-valuenow` mirroring `--split`.

## GSAP Translation

When a project already uses GSAP, tween the clip directly rather than toggling classes:

```js
gsap.to('.reveal', { clipPath: 'inset(0 0 0 0)', duration: 0.6, ease: 'power3.out' });
```

## Reduced Motion

Every clip-path animation needs a reduced-motion guard. Snap to the revealed state instead of wiping.

```css
@media (prefers-reduced-motion: reduce) {
  .reveal, .scroll-reveal { animation: none; transition: none; clip-path: inset(0 0 0 0); }
  .tab__active { transition: none; }
}
```

## Sidecoach Application

- Prefer `clip-path: inset(...)` over animating `width`/`height`/`max-height` for reveals; it composites instead of reflowing.
- Add `will-change: clip-path` only for the animation's duration, then remove it.
- Every clipped duplicate overlay used for color/state must be `aria-hidden="true"`.
- Hold-to-delete and comparison sliders must expose keyboard-operable fallbacks.
- All clip-path motion respects `prefers-reduced-motion: reduce` by snapping to the final state.
- Translate Framer `clipPath` animations to the vanilla CSS or GSAP forms above; do not ship Framer-specific APIs as required.
