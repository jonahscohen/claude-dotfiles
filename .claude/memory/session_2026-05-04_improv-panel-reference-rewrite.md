---
name: Improv property panel reference tool rewrite
description: Complete rewrite of property-panel.ts to use reference tool icons from icons.ts, add Fill/Border/Shadow/Filters sections, fix alignment UI
type: project
---

## What changed

- Removed ALL old Lucide SVG icon code (svgIcon helper, chevronDownIcon, plusIcon, chainIcon, splitIcon, codeTagIcon, componentIcon, and all inline path constants ALIGN_H_*, ALIGN_V_*, ICON_*, TEXT_ALIGN_*, TEXT_VALIGN_*, ICON_PADDING_*, ICON_MARGIN_*, ICON_RADIUS)
- Added imports from `./icons.js` for 33 reference tool icon functions
- Position section: replaced 3x3 alignment grid with two 3-button groups (H align + V align) with enable/disable based on position type and parent layout
- Layout section: moved 3x3 alignment grid here (shown only when flex), uses iconDot/iconPosition* icons, maps to justifyContent + alignItems
- Display segmented control: uses reference tool icon factory functions (rectangleSmall, autolayoutAddHorizontal, autolayoutAddVertical, gridView) via new makeSegmentedControlWithIcons method
- Text align/vertical align: uses textAlignLeft/Center/Right and textAlignTop/Middle/Bottom from icons.ts
- Color inputs: split into hex section + opacity section with 1px gap, independent hover states
- Combo inputs: split into input area + chevron trigger with 1px gap, independent hover states
- Fill section: real section with ColorInput for backgroundColor when present, + button on hover
- Border section: color row, width row with split button, style select when border exists
- Shadow section: color row, X/Y inputs, blur/spread inputs, inset/outside type toggle using parseBoxShadow/buildBoxShadow helpers
- Filters section: slider rows for each filter function with click-to-adjust track, using parseFilterString/buildFilterString helpers
- Lock button: uses lockClosed/lockOpen icons with toggle state
- Split button: uses minus icon instead of old Lucide splitIcon
- New makePropInputWithIcon method accepts icon factory function instead of path string
- New makeShadowPropInput method for shadow-specific inputs that modify the ParsedShadow object

## Collaborator
Jonah

## Files touched
- `core/manipulate/property-panel.ts` - complete rewrite (2644 -> 3311 lines)
