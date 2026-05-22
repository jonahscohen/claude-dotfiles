import { BaseFlowHandler, FlowExecutionContext, FlowExecutionResult } from './flow-handler';
import { FlowHistory, getFlowHistory } from './flow-history';

/**
 * Flow U: Curate - 5-Step Design Reference Capture
 * Wizard for adding components/patterns to the design-references catalog
 * Steps: source + selection, auto-tag, describe, slug, save
 */
export class FlowUCurateHandler extends BaseFlowHandler {
  constructor() {
    super('flowU_curate');
  }

  async execute(context: FlowExecutionContext): Promise<FlowExecutionResult> {
    const guidance: string[] = [
      'Step 1: Source Selection - Where did this component/pattern come from?',
      '  - Paste URL, file path, or screenshot reference',
      '  - Verify it is production-tested and not aspirational',
      '',
      'Step 2: Component Selection - What element(s) are you capturing?',
      '  - Extract from design file or live UI',
      '  - Screenshot with measurements (Figma link preferred)',
      '  - Verify it is the definitive version from your DESIGN.md or design system',
      '',
      'Step 3: Auto-Tag - Mechanical categorization',
      '  - Category: (button|input|select|card|modal|layout|pattern|animation|spacing|typography)',
      '  - Accessibility: (wcag-a|wcag-aa|wcag-aaa|untested)',
      '  - Responsive: (fixed|fluid|grid-based|mobile-first)',
      '  - Framework: (vanilla|react|vue|web-component)',
      '',
      'Step 4: Why Interesting - Freeform narrative',
      '  - What problem does this solve?',
      '  - What makes it better than the obvious approach?',
      '  - When would someone choose this over alternatives?',
      '  - What constraints or context shaped this design?',
      '',
      'Step 5: Save to Catalog',
      '  - Auto-generated slug: component-name-variant (all-lowercase, kebab-case)',
      '  - Stored in: ~/.sidecoach/design-references.json (project-keyed)',
      '  - Becomes available to: /impeccable teach, design-references catalog, Flow D (reference search)',
    ];

    const checklist = this.createChecklist([
      { label: 'Step 1: Locate and verify source (URL, path, or screenshot)', required: true },
      {
        label: 'Step 2: Extract element(s) - screenshot with measurements or Figma link',
        required: true,
      },
      { label: 'Step 3: Auto-tag - category, accessibility, responsive, framework', required: true },
      { label: 'Step 4: Write why-interesting narrative (50-200 words)', required: true },
      { label: 'Step 5: Verify slug and save to design-references catalog', required: true },
    ]);

    return {
      flowId: this.flowId,
      flowName: this.getFlowName(),
      status: 'success',
      message: 'Design reference capture wizard - 5 steps to add components to the catalog',
      guidance,
      checklist,
      artifacts: [
        {
          type: 'reference',
          name: 'Design References Catalog',
          description: 'Project-level catalog of curated components and patterns',
          content: '~/.sidecoach/design-references.json (project-keyed JSON storage)',
        },
      ],
    };
  }
}

/**
 * Flow V: All-Seven QA - Comprehensive Design Pipeline QA
 * Chains all 7 tiers in sequence for end-to-end verification
 * Runs: Strategy (A-E) + Build (F-I) + Polish (J-P) + Specialized (Q-T)
 */
export class FlowVAllSevenQAHandler extends BaseFlowHandler {
  constructor() {
    super('flowV_all_seven_qa');
  }

  async execute(context: FlowExecutionContext): Promise<FlowExecutionResult> {
    const flowHistory = getFlowHistory();
    const guidance: string[] = [
      'All-Seven QA: End-to-end verification of the complete design pipeline',
      '',
      'This flow chains all 7 Sidecoach tiers in sequence:',
      '',
      'TIER 1 - STRATEGY & RESEARCH (Flows A-E):',
      '  A. Brand Verify - Alignment with PRODUCT.md and brand guidelines',
      '  B. Component Research - Inventory of existing components (accessibility, coverage)',
      '  C. Font Research - Typography system (font choices, loading, fallbacks)',
      '  D. Reference Search - Inspiration and prior art from design catalog',
      '  E. Motion Patterns - GSAP/Lenis integration and motion library',
      '',
      'TIER 2 - BUILD (Flows F-I):',
      '  F. Design Tokens - Extract colors, spacing, typography as design tokens',
      '  G. Component Implementation - Build components from design with tokens',
      '  H. Motion Integration - Integrate animations and interactions',
      '  I. Accessibility - WCAG compliance, screen reader testing, keyboard nav',
      '',
      'TIER 3 - POLISH (Flows J-P):',
      '  J. Tactical Polish - 16-point refinement rules (concentric radius, optical alignment, etc)',
      '  K. Multi-Lens Audit - 5-dimension technical scan (a11y, perf, theming, responsive, anti-patterns)',
      '  L. Design Critique - Nielsen heuristics + AI-slop detection + cognitive load review',
      '  M. Responsive Validation - Breakpoint testing + touch target verification (40x40px)',
      '  N. Rapid Iteration - Token-based variation generation and refinement',
      '  O. Clone Match - Pixel-perfect comparison against design source',
      '  P. Constraint Design - Finalization within design system constraints',
      '',
      'TIER 4 - SPECIALIZED (Flows Q-T):',
      '  Q. Migration - Dependency mapping + API migration planning',
      '  R. Layout Optimization - Whitespace, alignment, visual hierarchy',
      '  S. Typography Excellence - Kerning, ligatures, variable fonts, line-height',
      '  T. Ambitious Motion - Advanced animation sequences and micro-interactions',
      '',
      'Gate Rules:',
      '  - PRODUCT.md must exist and be >200 chars',
      '  - DESIGN.md must exist with colors, typography, spacing (Tier 2+)',
      '  - At least one Tier 2 flow must have succeeded before Tier 3 can start',
      '  - Blocking regressions (status degradation) stop the chain immediately',
      '  - Warning regressions (guidance/checklist drops) are logged but chain continues',
      '  - All open design debt is surfaced at session start',
    ];

    // Build checklist showing expected flow sequence
    const checklist = this.createChecklist([
      { label: 'Verify PRODUCT.md exists (>200 chars)', required: true },
      { label: 'Verify DESIGN.md exists with tokens', required: true },
      { label: 'TIER 1: Run A-E (strategy and research)', required: true },
      { label: 'TIER 2: Run F-I (build)', required: true },
      { label: 'TIER 3: Run J-P (polish)', required: true },
      { label: 'TIER 4: Run Q-T (specialized)', required: true },
      { label: 'Verify zero blocking regressions detected', required: true },
      { label: 'Review all design debt items', required: true },
      { label: 'Document any Medium-priority findings with trade-off justification', required: false },
    ]);

    return {
      flowId: this.flowId,
      flowName: this.getFlowName(),
      status: 'success',
      message:
        'All-Seven QA: Chain all 7 design pipeline tiers end-to-end (prerequisite: PRODUCT.md + DESIGN.md)',
      guidance: [
        ...guidance,
        '---',
        'How to use this flow:',
        '1. Run Flow A (Brand Verify) to start the chain',
        '2. Each flow will recommend the next flow based on success',
        '3. The orchestrator will enforce tier prerequisites and gate advancement',
        '4. Design debt and regressions are auto-surfaced at each step',
      ],
      checklist,
    };
  }
}

export function registerCurateQAHandlers(): Array<[string, () => BaseFlowHandler]> {
  return [
    ['flowU_curate', () => new FlowUCurateHandler()],
    ['flowV_all_seven_qa', () => new FlowVAllSevenQAHandler()],
  ];
}
