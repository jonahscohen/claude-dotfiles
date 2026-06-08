import type { DesignKnowledgeModule } from './index';

export const antiSlopKnowledge: DesignKnowledgeModule = {
  id: 'anti-slop',
  title: 'Anti-Slop Defaults',
  content: `BANNED defaults (AI models over-use these -- avoid unless explicitly requested):
- Colors: indigo #6366F1, violet #8B5CF6, the typical blue-to-purple gradient, hot pink #ec4899
- Color combos: hot pink + purple (THE "AI modern" signature), pink + deep blue gradients, neon magenta as primary accent
- Effects: glassmorphism/backdrop-blur cards, gradient mesh backgrounds, decorative blob SVGs, frosted glass overlays
- Fonts: Poppins (overused in AI-generated designs)
- Layouts: hero sections with floating 3D illustrations, asymmetric bento grids without content justification

USE INSTEAD:
- Colors: muted professional palettes -- slate, zinc, stone, neutral grays with one restrained accent
- OR warm-cool pairs: amber + teal, warm brown + cool blue (never the AI pink/purple combo)
- Shadows: subtle and functional -- 0 1px 2px rgba(0,0,0,0.05) for cards, 0 1px 3px rgba(0,0,0,0.1) for elevated elements, 0 4px 6px rgba(0,0,0,0.07) for dropdowns
- Fonts: Inter, system font stack, or the project's specified typeface
- Backgrounds: solid colors or very subtle noise texture, not gradients
- Layouts: clean single-column or standard grid, content-driven not decoration-driven`,
  modes: ['generate', 'modify', 'style-transfer', 'components', 'critique'],
  priority: 4,
};
