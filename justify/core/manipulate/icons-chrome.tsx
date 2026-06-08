/**
 * icons-chrome.tsx - the 8 toolbar "chrome" icons for the ported Retune panel.
 *
 * Retune sources these from the PAID @central-icons-react set, which we cannot
 * redistribute. Each is replaced 1:1 with the closest FREE Lucide icon, copied
 * VERBATIM (path data character-for-character) from lucide-static v1.17.0
 * (https://unpkg.com/lucide-static@1.17.0/icons/<name>.svg). No SVG is drawn or
 * approximated by hand. Lucide is ISC-licensed.
 *
 * Mapping (Retune @central-icons-react original -> Lucide replacement):
 *   IconCursor1            (edit mode)        -> mouse-pointer-2
 *   IconSettingsGear2      (settings)         -> settings
 *   IconCrossMedium        (close)            -> x
 *   IconBroom              (reset/clear all)  -> eraser        (closest free "clear" glyph)
 *   IconCheckCircle2       (copy confirmed)   -> circle-check
 *   IconStepBack           (undo/step back)   -> step-back
 *   IconSquareBehindSquare6 (copy / tab icon) -> copy
 *   IconCursorClick        (collapse/activate)-> mouse-pointer-click
 *
 * Lucide canonical attrs: 24x24 viewBox, fill none, stroke currentColor,
 * stroke-width 2, round caps/joins. `size` overrides width/height (default 20,
 * matching Retune's toolbar icon size).
 */

import type { JSX } from 'preact';

interface IconProps {
  size?: number;
}

function svgProps(size: number): JSX.SVGAttributes<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  };
}

/** Edit mode. Replaces Retune IconCursor1. Lucide: mouse-pointer-2 */
export function IconCursor({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z" />
    </svg>
  );
}

/** Settings. Replaces Retune IconSettingsGear2. Lucide: settings */
export function IconSettings({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** Close. Replaces Retune IconCrossMedium. Lucide: x */
export function IconClose({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

/** Reset / clear all. Replaces Retune IconBroom. Lucide: eraser */
export function IconClear({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M21 21H8a2 2 0 0 1-1.42-.587l-3.994-3.999a2 2 0 0 1 0-2.828l10-10a2 2 0 0 1 2.829 0l5.999 6a2 2 0 0 1 0 2.828L12.834 21" />
      <path d="m5.082 11.09 8.828 8.828" />
    </svg>
  );
}

/** Copy confirmed. Replaces Retune IconCheckCircle2. Lucide: circle-check */
export function IconCheckCircle({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/** Undo / step back. Replaces Retune IconStepBack. Lucide: step-back */
export function IconStepBack({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M13.971 4.285A2 2 0 0 1 17 6v12a2 2 0 0 1-3.029 1.715l-9.997-5.998a2 2 0 0 1-.003-3.432z" />
      <path d="M21 20V4" />
    </svg>
  );
}

/** Copy / tab icon. Replaces Retune IconSquareBehindSquare6. Lucide: copy */
export function IconCopy({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

/** Collapse / activate launcher. Replaces Retune IconCursorClick. Lucide: mouse-pointer-click */
export function IconCursorClick({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M14 4.1 12 6" />
      <path d="m5.1 8-2.9-.8" />
      <path d="m6 12-1.9 2" />
      <path d="M7.2 2.2 8 5.1" />
      <path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z" />
    </svg>
  );
}
