import type { DesignKnowledgeModule } from './index';

export const craftKnowledge: DesignKnowledgeModule = {
  id: 'craft',
  title: 'UI Craft Details',
  content: `Focus states: 2px solid ring in brand color, 2px offset from element edge, visible on both light and dark backgrounds. Never remove focus styles.
Form inputs: 40px minimum height, 12px horizontal padding, labels always above the field (not inline), placeholder text at 50% opacity of body color. Error state: red-500 (#EF4444) border, red-50 background tint, error message below in red-600.
Image aspect ratios: use 16:9 (hero/banner), 4:3 (cards/thumbnails), 1:1 (avatars/profile). Apply consistent border-radius (8px cards, 50% avatars).
Loading patterns: prefer skeleton screens over spinner overlays -- they reduce perceived wait time. Skeleton = neutral-200 pulsing rectangles matching content shape.
Touch targets: 44px minimum on mobile for all interactive elements. Small icons in larger tappable frames.
Dividers: 1px solid neutral-200 (light) or neutral-700 (dark). Use sparingly -- spacing alone usually suffices.`,
  modes: ['generate', 'modify', 'components', 'critique'],
  priority: 5,
};
