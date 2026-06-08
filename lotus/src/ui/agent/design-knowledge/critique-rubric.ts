import type { DesignKnowledgeModule } from './index';

export const critiqueRubric: DesignKnowledgeModule = {
  id: 'critique-rubric',
  title: 'Design Critique Rubric',
  content: `Score each dimension 1-5. Report the score, a one-sentence rationale, and a specific fix for anything below 4.

1. Visual Hierarchy: 1=no focal point, everything same weight. 2=some size difference. 3=clear heading/body distinction. 4=strong scannable flow. 5=compelling focal path guides the eye exactly where it should go.
2. Spacing Consistency: 1=random gaps everywhere. 2=some repeated values. 3=mostly consistent, minor deviations. 4=tight 8px grid adherence. 5=perfect rhythmic spacing, every gap intentional.
3. Color Harmony: 1=clashing or random colors. 2=too many hues. 3=functional but bland. 4=cohesive palette with clear roles. 5=refined palette with nuanced tints, proper semantic usage.
4. Typography: 1=3+ fonts or unreadable sizes. 2=inconsistent weights. 3=readable, proper hierarchy. 4=well-paired fonts, clear scale. 5=expert typographic rhythm, optical adjustments present.
5. Accessibility: 1=fails WCAG AA contrast. 2=some contrast issues. 3=passes AA. 4=passes AA with good focus states and labels. 5=passes AAA, full keyboard nav, ARIA-complete.
6. Responsiveness: 1=fixed pixel sizes, no flexibility. 2=partial auto-layout. 3=auto-layout throughout. 4=breakpoint-aware constraints. 5=fully adaptive across all viewports.
7. Alignment: 1=stray pixels, nothing aligned. 2=some alignment, inconsistent edges. 3=mostly grid-aligned. 4=clean alignment with minor optical issues. 5=pixel-perfect grid adherence, optical corrections applied.`,
  modes: ['critique'],
  priority: 1,
};
