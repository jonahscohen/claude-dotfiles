import type { DesignKnowledgeModule } from './index';

export const premiumPatternsKnowledge: DesignKnowledgeModule = {
  id: 'premium-patterns',
  title: 'Premium Design Patterns',
  modes: ['generate', 'modify', 'style-transfer', 'components', 'critique'],
  priority: 2,
  content: `## Typography: Proportional Letter-Spacing

Large headings need AGGRESSIVE negative letter-spacing to feel elegant, not bloated. Use proportional spacing, not fixed values.

**Formula:** letter-spacing = -5% to -7% of font-size
- 70px heading: -3.5px to -4.9px
- 48px heading: -2.4px to -3.4px
- 32px heading: -1.6px to -2.2px
- 24px heading: -1.2px to -1.7px
- 16px body: -0.48px to -0.64px

This prevents the "AI inflated headline" look and creates visual elegance.

## Color: Warm Backgrounds Signal Quality

Page backgrounds should have warmth, not pure white or cool gray. This single choice communicates premium craftsmanship.

**Background colors:**
- Warm cream preferred: #fcf6ef, #efebe5, #f6f0e9
- NOT pure white #ffffff or cool gray #fafafa
- Reason: Flatters other colors, implies physical quality and craftsmanship, reduces clinical feel

**Text hierarchy:** Continue using the neutral scale (gray 50-950) for text contrast. Warm backgrounds work equally well with neutral grays.

## Spacing: 64px Rhythmic Composition

The 8px grid is the foundation. Additionally, use 64px as a rhythmic unit for major composition.

**Spacing scale:**
- Section padding: 64px horizontal, 80-160px vertical
- Major section gaps: 64px
- Card/component padding: 24-32px (internal)
- Card gaps: 16-24px

When everything shares 64px as a rhythm unit, the entire page reads as one composed object rather than assembled components.

## Components: Translucent Surfaces

Premium cards are subtly translucent, not solid opaque with shadows.

**Light mode:**
- Card background: rgba(255,255,255,0.32)
- NO box-shadow
- Border-radius: 24-32px (generous, soft)

**Dark mode:**
- Card background: rgba(255,255,255,0.06-0.12)
- NO box-shadow
- Border-radius: 24-32px

Translucence makes cards feel like part of the environment, not overlaid elements.

## Buttons: Text-Slide Hover Pattern

Premium button hover is choreographed motion, not just a color change. This is THE signature interaction pattern.

**Implementation:**
- Container has overflow: hidden
- Contains TWO text copies with same content
- First text: visible at position static, opacity 1
- Second text: hidden above at top -22px, opacity 0
- On hover: first text slides down and fades out, second slides in from above and fades in
- Duration: 200-300ms
- Easing: ease-out or cubic-bezier(0.56, 0.22, 0.05, 0.99)

This motion pattern instantly communicates premium quality through purposeful interaction.

## Composition: Section Labels

Every major section has a small orienting label above the heading. This creates a three-tier visual hierarchy.

**Section label specifications:**
- Font size: 14px
- Font weight: 500 (medium)
- Color: Same as primary text color (not gray)
- Letter-spacing: -0.56px (same tracking as body)
- Margin below: 16-24px before the heading
- Text-transform: None (not uppercase)

**Structure:**
[Small label]         "Who we are"
[Large heading]       "The design agency built for you"
[Body description]    "We built this to..."

The label gives context before the headline hits, breaking up vertical rhythm and establishing hierarchy.

## Animation: Spring Physics

Motion should feel physical and alive, not robotic. Specify spring physics instead of generic easing.

**Spring values (preferred):**
- damping: 27
- mass: 0.3
- stiffness: 121

**Alternative cubic-bezier:**
- cubic-bezier(0.56, 0.22, 0.05, 0.99)

**Stagger principle:**
- Elements entering together use 100ms delays between them
- Hero Y offset: 170-560px (most dramatic)
- Interior section Y offset: 40-80px (subtler)
- Hero duration: 2.0-2.5s
- Section duration: 0.8-1.2s

Never use linear easing on animations.

## Interactions: Keyword Emphasis in Headings

One key word per heading is visually emphasized to guide the reader's eye to the emotional core.

**Two approaches:**

*Color shift:* The emphasized word uses a muted secondary color while the rest stays primary.
- Example: "The AI agency built for **you.**" (you in secondary color, rest in primary)

*Italic shift:* One word is italicized within an otherwise upright heading.
- Example: "How we can help you *grow*"

**Rules:**
- Only one word or short phrase per heading
- Choose the emotional payload word: "you", "everything", "clarity", "results"
- Never emphasize the first word (it needs to feel discovered as the eye scans)
- Be consistent across the entire site (all color-shift OR all italic, not mixed)

## Button Hierarchy

Establish clear visual weight differentiation between button types.

**Primary CTA:**
- Dark background (brand dark or black), white/cream text
- Padding: 10-16px vertical, 20-32px horizontal
- Border-radius: 12px
- Usage: 1-2 per section maximum
- Hover: Text-slide pattern (see above)

**Secondary:**
- Light background (section background tinted), dark text
- Padding: 10-16px vertical, 20-32px horizontal
- Border-radius: 12px
- Usage: Alongside primary for comparison/options

**Ghost/Tertiary:**
- Transparent background, brand color text
- No border or 1px subtle border
- Padding: 10-16px vertical, 20-32px horizontal
- Border-radius: 12px
- Usage: Navigation, less important actions

Size, color, and spacing communicate hierarchy. Never make all buttons identical.

## Composition: Asymmetry = Intentional Design

Symmetry is the absence of design decision. Asymmetry communicates intentionality.

**Avoid:**
- Centered hero with centered text, centered button, centered everything
- Three equal-width cards in a row (most generic layout in existence)

**Prefer:**
- Split layouts (image left, text right OR vice versa)
- Asymmetric grids with varying card sizes
- 2-column zig-zag layouts
- Off-center compositions
- Masonry or irregular card arrangements

When a layout is asymmetric, the viewer perceives it as designed. Symmetry feels templated.
`,
};
