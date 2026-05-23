# Sidecoach with Yes& Branding
## Design System and Style Guide

Based on [Yes& Agency](https://yesandagency.com) visual language: Bold, creative, artistic ampersand-driven design with vibrant color palette and generous spacing.

---

## Overview

Sidecoach landing and documentation pages implement Yes& design principles: artistic ampersand as primary visual element, vibrant color palette (red, teal, gold, magenta), bold confident typography, generous whitespace, and photography/imagery integrated through shaped cutouts. The design system emphasizes creativity, confidence, and visual impact.

---

## Colors

### Primary Brand
- **Red Ampersand**: `#E31C3D` - Logo, primary accent, call-to-action
- **Dark Teal**: `#1B4D4D` - Large blocks, section backgrounds, footer
- **White**: `#FFFFFF` - Canvas, negative space, breathing room
- **Dark Gray**: `#2C2C2C` - Body text, primary typography

### Secondary Accents
- **Gold**: `#D4AF37` - Vibrant highlights, decorative elements
- **Magenta**: `#E21B8C` - Vibrant accents, secondary highlights
- **Light Gray**: `#F5F5F5` - Subtle backgrounds, borders

### Usage
- Backgrounds: White for primary, Dark Teal for statement sections, Light Gray for secondary content
- Text: Dark Gray for primary text, White on Dark Teal sections
- Accents: Red for CTAs and primary actions, Gold and Magenta for vibrant highlights
- Borders: Light Gray (1px)

---

## Typography

### Typefaces
- **Primary (Display/Headings)**: Inter, Grotesk, or Roboto (bold, confident, modern)
- **Secondary (Body)**: Inter or System Font Stack (clean, readable, generous)
- Font fallback: `system-ui, -apple-system, sans-serif`

### Scale and Weights
| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 (Hero) | 56-64px | 700 (Bold) | 1.2 |
| H2 (Section) | 40-48px | 700 (Bold) | 1.3 |
| H3 (Subsection) | 28-32px | 600 (SemiBold) | 1.4 |
| Body | 16-18px | 400 (Regular) | 1.6 |
| Small (captions) | 14px | 400 (Regular) | 1.5 |
| Mono/Code | 14px | 400 (Regular) | 1.5 |

---

## Layout and Spacing

### Grid System
- **Container width**: 1200px max
- **Gutter**: 32px between major sections
- **Responsive breakpoints**:
  - Desktop: 1200px+
  - Tablet: 768px to 1199px
  - Mobile: 320px to 767px

### Spacing Scale
```
8px, 16px, 24px, 32px, 48px, 64px, 96px, 128px
```
Use multiples of 8px for vertical rhythm. Generous whitespace is intentional.

### Whitespace
- **Hero section**: 160px top/bottom padding
- **Section padding**: 96px top/bottom
- **Card padding**: 40px
- **Between elements**: 32px to 48px
- Never use less than 24px between major sections
- Generous internal spacing within cards and blocks

---

## Components

### Hero Section
- Full-width background (white)
- Large artistic ampersand (&) as centerpiece (200px+)
- Headline below (H1, 56-64px, bold, Dark Gray)
- Subheadline (18px, 400 weight, Dark Gray)
- CTA button (Red Ampersand background, white text, generous padding)
- Optional decorative elements or imagery

### Feature Card
- White background with Light Gray border (1px)
- 40px padding
- H3 heading (28-32px, bold)
- Description (16px body, Dark Gray)
- Optional: Link or secondary CTA
- Hover: subtle shadow lift, slight color shift

### Section Block
- Dark Teal background (#1B4D4D)
- White text
- 96px padding vertical
- Centered, max-width 1200px
- Large, confident typography
- Brand statement style sections

### Service Grid
- 3-column layout on desktop, responsive on tablet/mobile
- Each service as clickable card
- Clean typography, Dark Gray text on white
- Generous spacing between cards

### Navigation (Header)
- 64px fixed height
- Logo/brand left-aligned (Red Ampersand)
- Navigation links right-aligned (16px, Dark Gray, no underline by default)
- Active state: Red underline or color shift
- Hover: slight opacity change

### Footer
- Dark Teal background
- White text
- 96px padding vertical
- Centered text, clean layout
- Links and credits

### Buttons
- **Primary (CTA)**: Red background, white text, 16px, 16px padding, 4px border radius, bold
- **Secondary**: Dark Teal background, white text, 16px, 16px padding, 4px border radius
- **Outlined**: White background, Red border (2px), Red text, 16px, 16px padding
- **Hover**: Slight opacity shift or shadow lift
- **Active**: Darker shade or inset effect
- Min touch target: 44x44px

---

## Visual Elements

### Ampersand (&)
- 200px+ size for hero, smaller for dividers/accents
- Red color (#E31C3D) with optional vibrant accent colors
- Positioned prominently as design element
- Can contain or frame content within organic shapes
- Used as divider or visual accent between sections

### Icons
- 24x24px minimum (32x32px preferred)
- Red, Gold, or Dark Gray colors
- Source: Heroicons, Lucide, or Tabler
- Consistent weight and style

### Dividers
- 2px solid Dark Teal or Gold for prominent dividers
- 1px Light Gray for subtle separations
- 32px margin above/below
- Can use red ampersand as decorative divider

### Photography/Imagery
- Vibrant, bold imagery
- Can be contained within ampersand cutout shapes
- Should convey creative energy and confidence

---

## Responsive Design

### Mobile First Approach
- Base styles for 320px+
- Tablet adjustments at 768px
- Desktop refinements at 1200px

### Responsive Rules
- Container: 100% width with 16px side padding on mobile
- Heading sizes: scale down (H1: 40px mobile to 64px desktop)
- Grid: Single column on mobile, 2 columns on tablet, 3+ on desktop
- Navigation: Compact on mobile, full on desktop
- Section padding: Reduces from 96px on desktop to 48px on mobile

---

## Do's and Don'ts

### Do
✓ Use generous whitespace and breathing room
✓ Keep Red Ampersand as primary accent and logo
✓ Maintain Dark Teal for contrast sections
✓ Scale typography confidently and generously
✓ Integrate imagery within organic shapes
✓ Center hero content, left-align body copy
✓ Use bold, confident language and design
✓ Ensure high contrast for accessibility

### Don't
✗ Use pastel or muted colors
✗ Reduce whitespace to fit content - rewrite instead
✗ Apply too many vibrant colors - use sparingly
✗ Use small font sizes below 14px for body copy
✗ Add gradients unless carefully designed
✗ Use multiple typeface families
✗ Apply excessive rounded corners or blur effects
✗ Use color alone to convey information

---

## Sidecoach Integration Points

- **Entry point**: Navigation routing via Sidecoach utterances
- **Design validation**: Flows validate color contrast, typography scale, spacing
- **Component documentation**: Auto-generated from Sidecoach flow data
- **Responsive verification**: Flows test breakpoint behavior across desktop/tablet/mobile
- **Accessibility**: Flows verify WCAG 2.1 AA compliance against this design system
