import type { DesignKnowledgeModule } from './index';

export const interactionStatesKnowledge: DesignKnowledgeModule = {
  id: 'interaction-states',
  title: 'Interaction States',
  content: `Every interactive element must support 9 states:
1. Default: base appearance, no interaction.
2. Hover: darken fill 8% or apply overlay rgba(0,0,0,0.08). Cursor pointer. Transition 150ms.
3. Active/Pressed: darken fill 12% or overlay rgba(0,0,0,0.12). Slight scale(0.98) optional.
4. Focus: 2px solid ring in brand color, 2px offset. Must be visible -- never remove for aesthetics.
5. Disabled: opacity 0.38 on the entire element. cursor not-allowed. No hover/active response.
6. Loading: replace content with skeleton pulse (neutral-200 to neutral-300 animation) matching content dimensions. Or inline spinner for buttons.
7. Error: red-50 (#FEF2F2) background, red-500 (#EF4444) border, red-600 text for message below.
8. Success: green-50 (#F0FDF4) background, green-500 (#22C55E) border, green-600 text for confirmation.
9. Empty: centered illustration (optional), descriptive text explaining the empty state, and a CTA button to take action.`,
  modes: ['generate', 'components', 'critique'],
  priority: 10,
};
