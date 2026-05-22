import { BaseFlowHandler, FlowExecutionContext, FlowExecutionResult } from './flow-handler';

// TIER 5: SPECIALIZED REFINEMENT FLOWS (NEW - impeccable v2.1.9 coverage)

/**
 * Flow R: Layout & Spacing Optimization
 * Fix layout, spacing, and visual rhythm - grid optimization, spacing ratios, visual hierarchy
 */
export class FlowRLayoutOptimizationHandler extends BaseFlowHandler {
  constructor() {
    super('flowR_layout_optimization');
  }

  async execute(context: FlowExecutionContext): Promise<FlowExecutionResult> {
    return {
      flowId: this.flowId,
      flowName: this.getFlowName(),
      status: 'success',
      message: 'Analyzing layout, spacing, and visual rhythm',
      guidance: [
        'Grid optimization: Extract grid system from DESIGN.md spacing tokens',
        'Spacing ratios: Verify consistent spacing scale (8px, 16px, 24px, 32px, etc.)',
        'Visual hierarchy: Check hierarchy through spacing relationships, not just typography',
        'Breathing room: Ensure adequate whitespace around key elements',
        'Alignment verification: All elements aligned to grid with no orphaned sizes',
        'Responsive grid: Verify grid scales proportionally across breakpoints',
        'Density audit: Check visual density (too tight / too sparse) at each breakpoint',
      ],
      checklist: this.createChecklist([
        { label: 'Grid system extracted from spacing tokens', required: true },
        { label: 'All spacing uses consistent scale', required: true },
        { label: 'Visual hierarchy clear through spacing', required: true },
        { label: 'Adequate whitespace around focal elements', required: true },
        { label: 'All elements aligned to grid', required: true },
        { label: 'Responsive grid scales correctly', required: true },
        { label: 'Visual density appropriate at all breakpoints', required: false },
        { label: 'Margins/padding follow token-based pattern', required: true },
      ]),
    };
  }
}

/**
 * Flow S: Typography Excellence
 * Improves typography - font choices, hierarchy, sizing, weight, readability
 */
export class FlowSTypographyExcellenceHandler extends BaseFlowHandler {
  constructor() {
    super('flowS_typography_excellence');
  }

  async execute(context: FlowExecutionContext): Promise<FlowExecutionResult> {
    return {
      flowId: this.flowId,
      flowName: this.getFlowName(),
      status: 'success',
      message: 'Analyzing and optimizing typography',
      guidance: [
        'Font hierarchy: Review heading, body, caption sizes and weights from DESIGN.md',
        'Readability metrics: Verify contrast (WCAG AA minimum), line-height (1.5-1.6 for body), line-length (50-75 chars)',
        'Weight hierarchy: Ensure weights (light/normal/bold/heavy) create clear visual distinction',
        'Scale consistency: Check type scale ratio (typically 1.125 or 1.25 multiplier)',
        'Variable font optimization: Leverage variable fonts for smooth weight/width transitions',
        'Multi-language support: Verify fonts have adequate language coverage if needed',
        'Performance: Check font loading strategy (preload, font-display, subset optimization)',
        'Size audit: Verify sizes are token-based, not hardcoded',
      ],
      checklist: this.createChecklist([
        { label: 'Font hierarchy matches DESIGN.md', required: true },
        { label: 'Contrast verified (WCAG AA+)', required: true },
        { label: 'Line-height appropriate (1.5-1.6 minimum for body)', required: true },
        { label: 'Line length reasonable (50-75 chars typical)', required: false },
        { label: 'Weight hierarchy creates visual distinction', required: true },
        { label: 'Type scale follows consistent ratio', required: true },
        { label: 'Variable fonts optimized if available', required: false },
        { label: 'Font loading strategy optimized', required: false },
        { label: 'All sizes use typography tokens', required: true },
        { label: 'Language coverage verified (if applicable)', required: false },
      ]),
    };
  }
}

/**
 * Flow T: Ambitious Motion & Physics
 * Push interfaces past conventional limits - shaders, spring physics, scroll-driven reveals, 60fps cinematic transitions
 */
export class FlowTAmbitiousMotionHandler extends BaseFlowHandler {
  constructor() {
    super('flowT_ambitious_motion');
  }

  async execute(context: FlowExecutionContext): Promise<FlowExecutionResult> {
    return {
      flowId: this.flowId,
      flowName: this.getFlowName(),
      status: 'success',
      message: 'Implementing ambitious motion and physics-based animations',
      guidance: [
        'Spring physics: Use GSAP physics with tension/friction for natural motion (not just easing)',
        'Scroll-driven reveals: Implement ScrollTrigger scrub with parallax, staggered reveals',
        'Shader effects: Consider WebGL shaders for advanced visual effects (if performance allows)',
        'Frame rate targets: Maintain 60fps minimum; profile with DevTools Performance tab',
        'Cinematic transitions: Multi-step animations (stagger, chain, timeline orchestration)',
        'Performance optimization: Use transform/opacity only (avoid paint/layout triggers)',
        'Mobile consideration: Reduce complexity on mobile; use `prefers-reduced-motion` respects',
        'Testing across devices: Verify smooth performance on target devices',
      ],
      checklist: this.createChecklist([
        { label: 'Spring physics implemented correctly (tension/friction)', required: true },
        { label: 'ScrollTrigger reveals working smoothly', required: true },
        { label: 'Animation maintains 60fps minimum', required: true },
        { label: 'No paint/layout thrashing detected', required: true },
        { label: 'Staggered animations orchestrated (GSAP timeline)', required: false },
        { label: 'Cinematic quality (multi-step animation chains)', required: false },
        { label: 'Shader effects (if attempted) performant', required: false },
        { label: 'prefers-reduced-motion respected', required: true },
        { label: 'Mobile performance verified', required: true },
        { label: 'DevTools profiles show no jank', required: true },
      ]),
    };
  }
}
