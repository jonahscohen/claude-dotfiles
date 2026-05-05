---
name: Improv icons extraction from reference tool v0.7.6
description: Extracted all SVG icons verbatim from reference source into icons.ts
type: project
---

## What
Created `improv/core/manipulate/icons.ts` containing 58 SVG icon functions extracted character-for-character from reference tool v0.7.6's `/tmp/reference-tool-inspect/package/dist/index.js`.

## Icons extracted (58 total)

### Radius (4) - lines 7957-7967
radiusTopLeft, radiusTopRight, radiusBottomLeft, radiusBottomRight

### Padding (7) - lines 7969-7988
alPaddingHorizontal, alPaddingVertical, alPaddingTop, alPaddingBottom, alPaddingLeft, alPaddingRight, alPaddingSides

### Spacing (2) - lines 7990-7994
alSpacingHorizontal, alSpacingVertical

### Layout alignment (6) - lines 7996-8030
layoutAlignLeft, layoutAlignRight, layoutAlignHorizontalCenter, layoutAlignTop, layoutAlignBottom, layoutAlignVerticalCenter

### Text alignment (6) - lines 8032-8048
textAlignLeft, textAlignCenter, textAlignRight, textAlignTop, textAlignMiddle, textAlignBottom

### Display/layout mode (4) - lines 8050-8060
rectangleSmall, autolayoutAddHorizontal, autolayoutAddVertical, gridView

### Utility (8) - lines 8062-8091
chevronDown, chevronUp, plus, minus, flipHorizontalSmall, adjustSmall, check, rotate

### Variable action (2) - lines 9062-9069
hexagonIcon, unlinkIcon

### Aspect ratio lock (2) - line 11051 (inline SVGs)
lockClosed, lockOpen

### Alignment grid position (7) - lines 9803-9822
iconDot, iconPositionLeft, iconPositionCenterH, iconPositionRight, iconPositionTop, iconPositionCenterV, iconPositionBottom

### Alignment grid stretch bars (8) - lines 9824-9847
iconSBBarH, iconSBBarHLeft, iconSBBarHCenter, iconSBBarHRight, iconSBBarV, iconSBBarVTop, iconSBBarVCenter, iconSBBarVBottom

### List/view (2) - lines 8083-8087
listView, numberList

## Key design decisions
- All 24x24 viewBox icons take `(size: number)` param, defaulting to 24
- Alignment grid icons use 16x16 viewBox and take `(size, color)` params, defaulting to `#a8a29e` (the reference tool's GRAY constant)
- `check` uses 16x16 viewBox (matching the reference tool's `Check` component default)
- `lockClosed`/`lockOpen` default to size 16 but use 24x24 viewBox (matching the reference tool's inline usage)
- No Link2/Link2Off icons exist in reference tool - aspect ratio uses lock/unlock icons instead
- All use `document.createElementNS` for proper SVG DOM creation
- Helper functions `makeSvg` and `makePath` reduce boilerplate

## Collaborator
Jonah

## Files
- `improv/core/manipulate/icons.ts` (created)
