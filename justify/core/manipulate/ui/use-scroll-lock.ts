/**
 * useScrollLock - locks page scroll when a floating UI (dropdown, picker, dialog) is open.
 * Uses a module-level ref counter so nested opens (e.g. color picker inside a dropdown)
 * don't prematurely unlock.
 *
 * Keeps the layout PERFECTLY STILL on lock/unlock by reserving the scrollbar gutter
 * (scrollbar-gutter: stable) instead of compensating with padding-right.
 *
 * DEVIATION from Retune's verbatim port: Retune used `overflow:hidden` + a
 * `padding-right = scrollbarWidth` compensation. That fixes the page CONTENT shift but
 * NOT fixed-position elements: hiding the scrollbar widens the viewport (initial
 * containing block), so Justify's fixed, right-anchored toolbar/panel jumps right by the
 * scrollbar width. `scrollbar-gutter: stable` reserves the scrollbar's space even while it
 * is hidden, so the viewport width is unchanged and nothing - content or fixed chrome -
 * moves. (Supported in Chrome 94+, the target runtime.)
 */

import { useEffect } from "react";

let lockCount = 0;
let savedOverflow = "";
let savedGutter = "";

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    if (lockCount === 0) {
      const html = document.documentElement;
      savedOverflow = html.style.overflow;
      savedGutter = html.style.scrollbarGutter;
      // Reserve the scrollbar gutter BEFORE hiding overflow, so the viewport width
      // (and thus the fixed toolbar/panel position) does not change.
      html.style.scrollbarGutter = "stable";
      html.style.overflow = "hidden";
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount === 0) {
        const html = document.documentElement;
        html.style.overflow = savedOverflow;
        html.style.scrollbarGutter = savedGutter;
      }
    };
  }, [active]);
}
