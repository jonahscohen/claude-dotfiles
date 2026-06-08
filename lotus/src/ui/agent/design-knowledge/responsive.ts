import type { DesignKnowledgeModule } from './index';

export const responsiveKnowledge: DesignKnowledgeModule = {
  id: 'responsive',
  title: 'Responsive Design',
  content: `Breakpoints (px): sm 640, md 768, lg 1024, xl 1280, 2xl 1536. Design mobile-first, then scale up.
Column grids: 1 column on mobile (<640), 2 columns on tablet (768-1023), 3-4 columns on desktop (1024+). Gutter 16px mobile, 24px tablet, 32px desktop.
Stack vs row: vertical stacking on mobile, horizontal rows on desktop. Cards stack single-column on mobile, 2-up on tablet, 3-4 on desktop.
Typography scaling: body stays 14-16px across breakpoints. Headings scale down 20-30% on mobile (desktop h1 48px becomes mobile 32px).
Touch targets: 44px minimum on mobile (sm/md breakpoints). Desktop can use 32px minimum.
Navigation: bottom tab bar on mobile (max 5 items), sidebar or top nav on desktop. Hamburger menu for overflow.
Spacing: reduce page margins on mobile (16-24px) vs desktop (32-64px). Section gaps compress proportionally.`,
  modes: ['generate', 'components', 'critique'],
  priority: 7,
};
