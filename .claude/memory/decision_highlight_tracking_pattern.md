---
name: Element highlight tracking pattern
description: Use rAF loop to track DOM elements with fixed-position highlights - the canonical pattern for scroll-following overlays
type: decision
---

When highlighting DOM elements with `position:fixed` overlay boxes, the highlight must follow the element during scroll. Static `getBoundingClientRect()` at creation time breaks on scroll.

**The pattern:**
```typescript
// Store element + overlay pairs
highlights: Array<{el: HTMLElement; box: HTMLElement}> = [];
rafId: number | null = null;

// Start tracking
function startTracking() {
  const tick = () => {
    for (const {el, box} of highlights) {
      const r = el.getBoundingClientRect();
      box.style.top = r.top + 'px';
      box.style.left = r.left + 'px';
      box.style.width = r.width + 'px';
      box.style.height = r.height + 'px';
    }
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

// Stop tracking
function clearHighlights() {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
  for (const {box} of highlights) box.remove();
  highlights = [];
}
```

**Why rAF:** Scroll events fire at variable rates. rAF syncs with the display refresh (60fps) and batches reads. Smooth 60fps tracking with no jank.

**Where this is used in improv:**
- `overlay.ts` trackElement: highlight follows hovered element
- `prompt/index.ts` selection overlays: multi-select boxes follow selected elements
- `index.ts` _taskHighlights: changes panel element highlighting

**Alternatives rejected:**
- Scroll event listener: fires too often, causes jank, misses momentum scrolling
- Static position at creation: breaks immediately on scroll
- CSS `position:absolute` inside element: requires injecting into the element's DOM, which can break layouts

**Revisit when:** CSS Anchor Positioning is widely supported - it solves this at the CSS level without JS tracking.
