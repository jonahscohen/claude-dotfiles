import type { DesignKnowledgeModule } from './index';

export const motionKnowledge: DesignKnowledgeModule = {
  id: 'motion',
  title: 'Motion and Animation',
  content: `Duration scale: micro 90ms (button feedback, toggle), small 150ms (hover states, fade), medium 250ms (modal open, panel slide), large 350ms (page transitions, expand/collapse), xl 500ms (complex orchestration, stagger).
Easing curves: entrance ease-out cubic-bezier(0, 0, 0.2, 1) -- fast start, gentle stop. Exit ease-in cubic-bezier(0.4, 0, 1, 1) -- gentle start, fast out. Standard cubic-bezier(0.4, 0, 0.2, 1) -- for moves and resizes.
Common mappings: hover effects 150ms ease-out, tooltips 150ms, dropdowns 200ms ease-out, modals 250ms ease-out, page transitions 350ms standard, skeleton loading pulse 1.5s ease-in-out infinite.
Rules: never animate layout properties (width/height) when transform (scale/translate) works. Respect prefers-reduced-motion by disabling non-essential animations.`,
  modes: ['generate', 'modify', 'components'],
  priority: 8,
};
