import type { DesignKnowledgeModule } from './index';

export const layoutKnowledge: DesignKnowledgeModule = {
  id: 'layout',
  title: 'Layout and Spacing',
  content: `Grid: 8px base grid, 4px sub-grid for fine adjustments (icon padding, text offsets).
Spacing scale (px): 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96. Never use arbitrary values like 13 or 27.
Component spacing: card internal padding 16-24px, section gaps 24-48px, page margins 24-64px (scales with viewport), inline element gaps 8-12px.
Z-index layers: base content 0, sticky headers 10, dropdowns 100, modals/overlays 200, toasts/notifications 300, tooltips 400.
Alignment: all elements on the same level should share a consistent left edge. Use auto-layout with consistent padding rather than absolute positioning.
Container max-width: 1280px for content areas, centered with auto margins. Full-bleed sections can span 100%.`,
  modes: ['generate', 'modify', 'components', 'critique'],
  priority: 3,
};
