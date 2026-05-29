---
source: https://github.com/mblode/agent-skills (ui-animation skill)
captured: 2026-05-28
license: MIT
attribution: mblode/agent-skills, ui-animation (MIT License)
type: motion-reference extension (gesture / drag physics)
stack_note: Framer Motion in the original has been translated to vanilla pointer events + GSAP (sidecoach stack is GSAP + Lenis)
maps_to: extended-domain-validator MOTION_GESTURE_001..MOTION_GESTURE_006 (domain "motion")
---

# Gesture & Drag Physics (GSAP + vanilla pointer events)

Drag physics math lifted from mblode/agent-skills' ui-animation skill (MIT). The
upstream examples are Framer Motion JSX; the math is library-agnostic, so it is
reproduced here as plain pointer-event TypeScript + GSAP. Strip nothing from the
math - the constants (velocity threshold, min distance, damping curve) are the
load-bearing part.

## 1. Pointer capture + single-pointer lockout

`setPointerCapture` keeps pointermove/pointerup firing even when the pointer
leaves the element bounds. Lock to the first `pointerId` so a second finger
(multi-touch) cannot corrupt the drag.

```ts
let activePointer: number | null = null;
let startX = 0, lastX = 0, lastT = 0, velocity = 0;

el.style.touchAction = "none"; // yield the gesture to us, not browser scroll

el.addEventListener("pointerdown", (e: PointerEvent) => {
  if (activePointer !== null) return;      // multi-touch lockout: ignore 2nd pointer
  activePointer = e.pointerId;
  el.setPointerCapture(e.pointerId);       // keep tracking outside bounds
  startX = lastX = e.clientX;
  lastT = e.timeStamp;
  velocity = 0;
});

el.addEventListener("pointermove", (e: PointerEvent) => {
  if (e.pointerId !== activePointer) return; // ignore non-primary pointers
  const dt = e.timeStamp - lastT;
  if (dt > 0) velocity = (e.clientX - lastX) / dt; // px per ms, signed
  lastX = e.clientX;
  lastT = e.timeStamp;

  const offset = e.clientX - startX;
  gsap.set(el, { x: withBoundaryDamping(offset, MAX_DRAG) });
});
```

## 2. Boundary damping (friction, not a hard stop)

Past the boundary, resistance grows asymptotically toward `max` - the element
keeps moving but with diminishing return, so it never hits a wall. Never clamp
`offset` to `max`; that reads as a mechanical hard stop.

```ts
const MAX_DRAG = 120; // px of give past the boundary

function withBoundaryDamping(offset: number, max: number): number {
  if (Math.abs(offset) <= max) return offset;
  const sign = Math.sign(offset);
  const past = Math.abs(offset) - max;
  // asymptotic resistance: approaches max but never exceeds it
  return sign * (max + max * (1 - Math.exp(-past / max)) - max * 0 ); // = sign*(max + damped(past))
}

// Simpler canonical form when the whole offset is past origin:
//   damped = max * (1 - Math.exp(-offset / max))
function rubberBand(offset: number, max: number): number {
  return max * (1 - Math.exp(-offset / max));
}
```

## 3. Velocity-based dismissal

Dismiss on a fast flick even when the travel is short. Use BOTH a velocity
threshold AND a minimum distance so a tiny jitter never dismisses.

```ts
const DISMISS_VELOCITY = 0.11; // px/ms
const DISMISS_MIN_DISTANCE = 20; // px

el.addEventListener("pointerup", (e: PointerEvent) => {
  if (e.pointerId !== activePointer) return;
  el.releasePointerCapture(e.pointerId);
  activePointer = null;

  const traveled = Math.abs(e.clientX - startX);
  const fastFlick = Math.abs(velocity) > DISMISS_VELOCITY && traveled > DISMISS_MIN_DISTANCE;

  if (fastFlick) {
    // 4. momentum-direction continuity: continue in the drag direction,
    //    do NOT snap backward. Project velocity into the settle tween.
    const dir = Math.sign(velocity);
    gsap.to(el, {
      x: dir * window.innerWidth,
      duration: 0.3,
      ease: "power2.out", // exponential ease-out (sidecoach motion law)
    });
  } else {
    // settle back to origin with spring-like ease
    gsap.to(el, { x: 0, duration: 0.4, ease: "power3.out" });
  }
});
```

## Constants (do not tune away)

| Constant | Value | Why |
|---|---|---|
| Dismiss velocity | `> 0.11` px/ms | Fast flick should dismiss regardless of distance |
| Dismiss min distance | `20` px | Prevents jitter/tap from registering as a flick |
| Boundary damping | `max * (1 - exp(-offset/max))` | Friction, never a hard stop |
| Pointer capture | `setPointerCapture(pointerId)` | Keeps tracking outside element bounds |
| Multi-touch | ignore 2nd `pointerId` | A second finger must not corrupt drag state |
| touch-action | `none` (or `pan-y`) | Browser must yield the gesture to pointer handlers |
| Release | momentum continues in drag direction | No backward snap on a committed flick |

## Validator mapping

These checks are encoded as `MOTION_GESTURE_001..006` in the `motion` domain of
`extended-domain-validator.ts`. They are N/A (passing) when no drag/gesture
interaction is detected and only assert physics correctness when one is present.
