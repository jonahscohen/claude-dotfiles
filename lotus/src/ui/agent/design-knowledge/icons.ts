import type { DesignKnowledgeModule } from './index';

export const iconsKnowledge: DesignKnowledgeModule = {
  id: 'icons',
  title: 'Iconography',
  content: `Size scale: 16px inline/tight UI, 20px default alongside text, 24px action buttons and nav, 32px feature highlights, 48px illustration/empty-state.
Spacing: 8px gap between icon and adjacent text. Vertically center icons with their label text.
Color: icons inherit parent text color by default. Use semantic colors only for status indicators (green check, red alert). Never randomly colorize icons.
Visual weight: all icons in a set must feel equally heavy -- consistent stroke width (1.5-2px) and optical size. Do not mix filled and outlined styles in the same context.
Touch targets: 44px minimum hit area on mobile (wrap 20-24px icon in 44px tappable frame with transparent padding).
Libraries: Lucide, Feather, Heroicons, Phosphor, Material Symbols, Tabler. Always use create_svg_node with real SVG path data from these libraries.`,
  modes: ['generate', 'modify', 'components', 'critique'],
  priority: 6,
};
