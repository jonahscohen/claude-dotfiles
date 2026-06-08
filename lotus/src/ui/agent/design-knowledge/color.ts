import type { DesignKnowledgeModule } from './index';

export const colorKnowledge: DesignKnowledgeModule = {
  id: 'color',
  title: 'Color System',
  content: `Palette roles: primary (brand), secondary (supporting), neutral (gray 50-950 for surfaces/text/borders), semantic (success=green, warning=amber, danger=red, info=blue).
Contrast minimums (WCAG AA): 4.5:1 for body text, 3:1 for large text (18px+ or 14px bold), 3:1 for UI controls and graphical objects.
Dark mode surface tokens: surface-0 #121212, surface-1 #1E1E1E, surface-2 #232323, surface-3 #2C2C2C, on-surface #E0E0E0, on-surface-muted #A0A0A0.
Never use pure black (#000) on pure white (#FFF) -- use near-black (#111) on near-white (#FAFAFA) to reduce eye strain.
Accent usage: one primary accent for CTAs, use tints (10-20% opacity) for backgrounds of semantic states.
Neutral scale: build at least 10 steps (50,100,200,...,900,950) to ensure enough contrast options for borders, disabled states, and subtle backgrounds.`,
  modes: ['generate', 'modify', 'style-transfer', 'components', 'critique'],
  priority: 2,
};
