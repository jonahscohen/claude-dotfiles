import type { DesignKnowledgeModule } from './index';

export const typographyKnowledge: DesignKnowledgeModule = {
  id: 'typography',
  title: 'Typography',
  content: `Type scale ratios: 1.2 (Minor Third) for compact UI, 1.25 (Major Third) for marketing/editorial.
Weight hierarchy: Regular 400 for body, Medium 500 for labels/captions, SemiBold 600 for subheadings, Bold 700 for headings only.
Line-height: 1.5 for body text (14-16px), 1.2-1.3 for headings (24px+). Never below 1.1.
Letter-spacing: -0.02em for large headings (28px+), 0 for body, +0.05em for all-caps labels and small text (11-12px).
Font pairing: sans-serif + serif (Inter + Lora), geometric + humanist (DM Sans + Source Sans 3). Max 2 families per design. Never pair two similar-feeling fonts.
Minimum sizes: 12px for UI labels, 14px for body text, 11px absolute floor for legal/footnotes.`,
  modes: ['generate', 'modify', 'style-transfer', 'components', 'critique'],
  priority: 1,
};
