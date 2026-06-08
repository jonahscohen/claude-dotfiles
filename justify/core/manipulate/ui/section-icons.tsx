/**
 * section-icons.tsx - Preact wrappers over the verbatim vanilla icons in
 * ../icons.ts, for the icons the Typography / Border sections reference as JSX.
 *
 * The vanilla icons.ts (sourced verbatim from Retune's ui/icons.tsx) returns
 * SVGSVGElement DOM nodes. These thin wrappers render that exact SVG markup into
 * the Preact tree via dangerouslySetInnerHTML, so the path data stays a single
 * verbatim source of truth (no re-drawing, no transcription). Each maps 1:1 to a
 * Retune ui/icons.tsx export of the same name.
 */

import {
  textAlignLeft, textAlignCenter, textAlignRight,
  textAlignTop, textAlignMiddle, textAlignBottom,
  adjustSmall, minus, plus, listView, numberList, alPaddingSides,
  layoutAlignLeft, layoutAlignRight, layoutAlignHorizontalCenter,
  layoutAlignTop, layoutAlignBottom, layoutAlignVerticalCenter,
  rectangleSmall, autolayoutAddHorizontal, autolayoutAddVertical, gridView,
  alSpacingHorizontal, alSpacingVertical,
  alPaddingHorizontal, alPaddingVertical,
  alPaddingTop, alPaddingBottom, alPaddingLeft, alPaddingRight,
  lockClosed, lockOpen,
} from '../icons.js';

interface IconProps { size?: number }

/** Render a vanilla icon-builder's SVG markup inside the Preact tree. */
function Vanilla({ make, size }: { make: (size?: number) => SVGSVGElement; size?: number }) {
  return (
    <span
      style={{ display: 'flex' }}
      dangerouslySetInnerHTML={{ __html: make(size).outerHTML }}
    />
  );
}

export const TextAlignLeft = ({ size }: IconProps) => <Vanilla make={textAlignLeft} size={size} />;
export const TextAlignCenter = ({ size }: IconProps) => <Vanilla make={textAlignCenter} size={size} />;
export const TextAlignRight = ({ size }: IconProps) => <Vanilla make={textAlignRight} size={size} />;
export const TextAlignTop = ({ size }: IconProps) => <Vanilla make={textAlignTop} size={size} />;
export const TextAlignMiddle = ({ size }: IconProps) => <Vanilla make={textAlignMiddle} size={size} />;
export const TextAlignBottom = ({ size }: IconProps) => <Vanilla make={textAlignBottom} size={size} />;
export const AdjustSmall = ({ size }: IconProps) => <Vanilla make={adjustSmall} size={size} />;
export const Minus = ({ size }: IconProps) => <Vanilla make={minus} size={size} />;
export const Plus = ({ size }: IconProps) => <Vanilla make={plus} size={size} />;
export const ListView = ({ size }: IconProps) => <Vanilla make={listView} size={size} />;
export const NumberList = ({ size }: IconProps) => <Vanilla make={numberList} size={size} />;
export const AlPaddingSides = ({ size }: IconProps) => <Vanilla make={alPaddingSides} size={size} />;

// Position alignment (Phase 4a)
export const LayoutAlignLeft = ({ size }: IconProps) => <Vanilla make={layoutAlignLeft} size={size} />;
export const LayoutAlignRight = ({ size }: IconProps) => <Vanilla make={layoutAlignRight} size={size} />;
export const LayoutAlignHorizontalCenter = ({ size }: IconProps) => <Vanilla make={layoutAlignHorizontalCenter} size={size} />;
export const LayoutAlignTop = ({ size }: IconProps) => <Vanilla make={layoutAlignTop} size={size} />;
export const LayoutAlignBottom = ({ size }: IconProps) => <Vanilla make={layoutAlignBottom} size={size} />;
export const LayoutAlignVerticalCenter = ({ size }: IconProps) => <Vanilla make={layoutAlignVerticalCenter} size={size} />;

// Layout display modes + gap (Phase 4a)
export const RectangleSmall = ({ size }: IconProps) => <Vanilla make={rectangleSmall} size={size} />;
export const AutolayoutAddHorizontal = ({ size }: IconProps) => <Vanilla make={autolayoutAddHorizontal} size={size} />;
export const AutolayoutAddVertical = ({ size }: IconProps) => <Vanilla make={autolayoutAddVertical} size={size} />;
export const GridView = ({ size }: IconProps) => <Vanilla make={gridView} size={size} />;
export const AlSpacingHorizontal = ({ size }: IconProps) => <Vanilla make={alSpacingHorizontal} size={size} />;
export const AlSpacingVertical = ({ size }: IconProps) => <Vanilla make={alSpacingVertical} size={size} />;

// Spacing padding/margin (Phase 4a)
export const AlPaddingHorizontal = ({ size }: IconProps) => <Vanilla make={alPaddingHorizontal} size={size} />;
export const AlPaddingVertical = ({ size }: IconProps) => <Vanilla make={alPaddingVertical} size={size} />;
export const AlPaddingTop = ({ size }: IconProps) => <Vanilla make={alPaddingTop} size={size} />;
export const AlPaddingBottom = ({ size }: IconProps) => <Vanilla make={alPaddingBottom} size={size} />;
export const AlPaddingLeft = ({ size }: IconProps) => <Vanilla make={alPaddingLeft} size={size} />;
export const AlPaddingRight = ({ size }: IconProps) => <Vanilla make={alPaddingRight} size={size} />;

// Size aspect-ratio lock (Phase 4a) - 16px inline locks
export const LockClosed = ({ size = 16 }: IconProps) => <Vanilla make={lockClosed} size={size} />;
export const LockOpen = ({ size = 16 }: IconProps) => <Vanilla make={lockOpen} size={size} />;
