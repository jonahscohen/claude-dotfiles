import { BaseFlowHandler, FlowExecutionContext, FlowExecutionResult } from './flow-handler';
import { ImpeccableDetectBridge } from './impeccable-detect-bridge';
import { ProjectPersonaEngine } from './persona-engine';
import * as fs from 'fs';
import * as path from 'path';

// TIER 3: POLISH/QA FLOWS

/**
 * Flow J: 16-Point Tactical Polish
 * Apply make-interfaces-feel-better rules for visual refinement
 */
export class FlowJTacticalPolishHandler extends BaseFlowHandler {
  constructor() {
    super('flowJ_tactical_polish');
  }

  async execute(context: FlowExecutionContext): Promise<FlowExecutionResult> {
    return {
      flowId: this.flowId,
      flowName: this.getFlowName(),
      status: 'success',
      message: 'Applying 16-point tactical polish rules',
      guidance: [
        'These 16 principles transform functional UI into delight-inducing experiences',
        'Apply tactically: not every rule applies to every element',
        'Group changes by principle and document before/after for PR clarity',
        'Test visual changes in real browser, not with JS inspection',
        'Verify no regressions in other UI areas',
      ],
      checklist: this.createChecklist([
        { label: '1. Concentric border radius (outer = inner + padding)', required: false },
        { label: '2. Optical over geometric alignment', required: false },
        { label: '3. Shadows over borders for depth', required: false },
        { label: '4. Interruptible animations (never block user)', required: false },
        { label: '5. Split and stagger enter animations', required: false },
        { label: '6. Subtle exit animations', required: false },
        { label: '7. Contextual icon animations (opacity+scale+blur)', required: false },
        { label: '8. Font smoothing enabled', required: false },
        { label: '9. Tabular numbers on dynamic text', required: false },
        { label: '10. Text wrapping with text-wrap: balance on headings', required: false },
        { label: '11. Image outlines rgba(0,0,0,0.1) never tinted', required: false },
        { label: '12. Scale on press: scale(0.96)', required: false },
        { label: '13. Skip animation on page load', required: false },
        { label: '14. Never use transition: all', required: false },
        { label: '15. Use will-change sparingly', required: false },
        { label: '16. Minimum hit area 40x40px', required: false },
      ]),
    };
  }
}

/**
 * Flow K: Multi-Lens Audit (5 dimensions)
 * Technical scan - accessibility, performance, theming, responsive, anti-patterns
 */
export class FlowKMultiLensAuditHandler extends BaseFlowHandler {
  constructor() {
    super('flowK_multi_lens_audit');
  }

  async execute(context: FlowExecutionContext): Promise<FlowExecutionResult> {
    const guidance: string[] = [
      'Dimension 1: Accessibility (WCAG compliance, semantic HTML, keyboard nav)',
      'Dimension 2: Performance (bundle size, Lighthouse scores, Core Web Vitals)',
      'Dimension 3: Theming (color system consistency, CSS variable usage, dark mode)',
      'Dimension 4: Responsive (breakpoints, touch targets, viewport behavior)',
      'Dimension 5: Anti-patterns (hardcoded values, dead code, deprecated APIs)',
      'Address all Critical and High findings; document trade-offs for Medium',
    ];

    // Wire ImpeccableDetectBridge for real 28-rule static analysis
    const bridge = new ImpeccableDetectBridge();
    const detectResult = bridge.detect(context.projectPath || process.cwd());
    if (detectResult.findings.length > 0) {
      const detectGuidance = bridge.findingsToGuidance(detectResult.findings);
      guidance.push('---');
      guidance.push(`Impeccable Detect findings (${detectResult.findings.length} issues):`);
      guidance.push(...detectGuidance);
    } else if (!detectResult.success || detectResult.rulesCovered === 0) {
      guidance.push(`Note: ${detectResult.message}`);
    }

    return {
      flowId: this.flowId,
      flowName: this.getFlowName(),
      status: 'success',
      message: 'Running 5-dimension technical audit (28-rule anti-pattern detection included)',
      guidance,
      checklist: this.createChecklist([
        { label: 'Run Lighthouse audit (a11y, performance, best practices)', required: true },
        { label: 'Run axe accessibility audit', required: true },
        { label: 'Check bundle size and code splitting', required: true },
        { label: 'Verify CSS variable usage (no hardcoded colors)', required: true },
        { label: 'Test responsive breakpoints', required: true },
        { label: 'Check for deprecated APIs or console warnings', required: true },
        { label: 'Address all Critical findings', required: true },
        { label: 'Address all High findings', required: true },
        { label: 'Document trade-offs for Medium findings', required: false },
      ]),
    };
  }
}

/**
 * Flow L: Design Critique (Nielsen heuristics)
 * Independent design review - Nielsen heuristics, AI-slop detection, cognitive load, emotional journey
 */
export class FlowLDesignCritiqueHandler extends BaseFlowHandler {
  constructor() {
    super('flowL_design_critique');
  }

  async execute(context: FlowExecutionContext): Promise<FlowExecutionResult> {
    const guidance: string[] = [
      'Nielsen 10 Usability Heuristics: visibility, match with real world, user control, consistency, error prevention, recognition vs recall, flexibility, aesthetic, error recovery, help & documentation',
      'AI-slop detection: generated copy, template language, lack of personality, generic imagery',
      'Cognitive load: information density, task complexity, decision fatigue',
      'Emotional journey: does the design support the brand personality and user emotion targets?',
      'This is an independent review - use fresh eyes and question every design choice',
    ];

    // Wire ProjectPersonaEngine to extract project-specific personas from PRODUCT.md
    const projectPath = context.projectPath || process.cwd();
    const productMdPath = path.join(projectPath, 'PRODUCT.md');
    let personaGuidance = '';

    try {
      if (fs.existsSync(productMdPath)) {
        const productMdContent = fs.readFileSync(productMdPath, 'utf-8');
        const engine = new ProjectPersonaEngine();
        const personas = await engine.generate(productMdContent);
        personaGuidance = engine.toCritiquePrompt(personas);
        guidance.push('---');
        guidance.push('Project-Specific Personas Extracted from PRODUCT.md:');
        guidance.push(personaGuidance);
      } else {
        guidance.push('---');
        guidance.push('Note: PRODUCT.md not found - using generic personas for critique');
      }
    } catch (error) {
      guidance.push('---');
      guidance.push(
        `Note: Could not extract personas from PRODUCT.md (${error instanceof Error ? error.message : 'unknown error'}) - using generic personas`
      );
    }

    return {
      flowId: this.flowId,
      flowName: this.getFlowName(),
      status: 'success',
      message: 'Independent design critique with project-specific personas',
      guidance,
      checklist: this.createChecklist([
        { label: 'Apply Nielsen heuristic #1: visibility of system status', required: true },
        { label: 'Apply Nielsen heuristic #2: match with real world', required: true },
        { label: 'Apply Nielsen heuristic #3: user control and freedom', required: true },
        { label: 'Apply Nielsen heuristic #4: consistency and standards', required: true },
        { label: 'Detect AI-generated copy or template language', required: true },
        { label: 'Assess cognitive load (not over-simplified, not overwhelming)', required: true },
        { label: 'Verify emotional journey aligns with brand and extracted personas', required: true },
      ]),
    };
  }
}

/**
 * Flow M: Responsive Design Validation
 * Breakpoint testing (from DESIGN.md), touch target verification (40x40px minimum), viewport behavior
 */
export class FlowMResponsiveValidationHandler extends BaseFlowHandler {
  constructor() {
    super('flowM_responsive_validation');
  }

  async execute(context: FlowExecutionContext): Promise<FlowExecutionResult> {
    return {
      flowId: this.flowId,
      flowName: this.getFlowName(),
      status: 'success',
      message: 'Validating responsive design across breakpoints and devices',
      guidance: [
        'Extract breakpoints from DESIGN.md (canonical source)',
        'Test each breakpoint: desktop, tablet, mobile (and any custom breakpoints)',
        'Verify touch targets: minimum 40x40px for all interactive elements',
        'Check viewport behavior: layout shift, overflow, spacing consistency',
        'Test on real devices (not just browser dev tools) for genuine user experience',
        'Document any breakpoint-specific behaviors or changes',
      ],
      checklist: this.createChecklist([
        { label: 'Extract breakpoints from DESIGN.md', required: true },
        { label: 'Test desktop breakpoint layout', required: true },
        { label: 'Test tablet breakpoint layout', required: true },
        { label: 'Test mobile breakpoint layout', required: true },
        { label: 'Verify all touch targets are 40x40px minimum', required: true },
        { label: 'Check for layout shift between breakpoints', required: true },
        { label: 'Verify no content overflow at any breakpoint', required: true },
        { label: 'Test on real device (not just browser dev tools)', required: true },
      ]),
    };
  }
}

/**
 * Flow N: Rapid Iteration (Token-based)
 * Goal-driven refinement with token-based variations, success criteria framework, decision criteria
 */
export class FlowNRapidIterationHandler extends BaseFlowHandler {
  constructor() {
    super('flowN_rapid_iteration_refined');
  }

  async execute(context: FlowExecutionContext): Promise<FlowExecutionResult> {
    return {
      flowId: this.flowId,
      flowName: this.getFlowName(),
      status: 'success',
      message: 'Rapid iteration with token-based variations',
      guidance: [
        'Define success criteria upfront: what does a successful design look like?',
        'Use DESIGN.md tokens for quick variations (colors, spacing, typography)',
        'Generate 3-5 variations per iteration by adjusting tokens',
        'Test each variation against success criteria and user feedback',
        'Narrow to winner and iterate deeper, or pivot if criteria not met',
        'Typical: 2-4 rounds to convergence (diminishing returns)',
      ],
      checklist: this.createChecklist([
        { label: 'Define success criteria for this element', required: true },
        { label: 'List 2-3 token variations to test', required: true },
        { label: 'Generate variations by adjusting DESIGN.md tokens', required: true },
        { label: 'Test variations against success criteria', required: true },
        { label: 'Gather feedback or measure against metrics', required: false },
        { label: 'Decide: iterate deeper, pivot, or converge', required: true },
      ]),
    };
  }
}

// TIER 4: SPECIAL WORKFLOWS

/**
 * Flow O: Clone/Match from Reference (Special)
 * Pixel-perfect 1:1 replication - element tree, typography, interactions, exact spacing
 */
export class FlowOCloneMatchHandler extends BaseFlowHandler {
  constructor() {
    super('flowO_clone_match_special');
  }

  async execute(context: FlowExecutionContext): Promise<FlowExecutionResult> {
    return {
      flowId: this.flowId,
      flowName: this.getFlowName(),
      status: 'success',
      message: 'Pixel-perfect 1:1 replication from reference',
      guidance: [
        'Clone means EXACT match - every detail must match the source',
        'Match: element tree structure, nesting hierarchy, naming',
        'Match: typography (font family, size, weight, line height, letter spacing)',
        'Match: spacing (padding, margin, gap), borders, shadows, colors',
        'Match: interactions (hover, press, disabled, focus states)',
        'No approximation or "close enough" - precise measurement required',
      ],
      checklist: this.createChecklist([
        { label: 'Measure element tree structure from reference', required: true },
        { label: 'Replicate nesting hierarchy exactly', required: true },
        { label: 'Match all typography (font, size, weight, line height)', required: true },
        { label: 'Match all spacing values precisely', required: true },
        { label: 'Match colors exactly (hex or token names)', required: true },
        { label: 'Match borders, shadows, and effects', required: true },
        { label: 'Match all interaction states (hover, press, disabled, focus)', required: true },
        { label: 'Side-by-side comparison: pixel-perfect match', required: true },
      ]),
    };
  }
}

/**
 * Flow P: Constraint-Based Design (Special)
 * Design under explicit limits - budget, scope, accessibility floor, creative problem-solving
 */
export class FlowPConstraintDesignHandler extends BaseFlowHandler {
  constructor() {
    super('flowP_constraint_design_special');
  }

  async execute(context: FlowExecutionContext): Promise<FlowExecutionResult> {
    return {
      flowId: this.flowId,
      flowName: this.getFlowName(),
      status: 'success',
      message: 'Design under explicit constraints and limits',
      guidance: [
        'Constraints inspire creativity - work within explicit boundaries',
        'Define the constraint clearly: budget (KB, components, time), scope, accessibility floor, performance target, etc.',
        'Design within the constraint, not around it - find creative solutions',
        'Document trade-offs and rationale for each design decision',
        'Verify final solution meets all constraints',
        'Constraints prevent over-engineering and keep focus on core goals',
      ],
      checklist: this.createChecklist([
        { label: 'Clearly define the constraint(s)', required: true },
        { label: 'Understand rationale for the constraint', required: true },
        { label: 'Brainstorm solutions that work within constraint', required: true },
        { label: 'Implement chosen solution', required: true },
        { label: 'Verify solution meets all constraints', required: true },
        { label: 'Document trade-offs made due to constraints', required: true },
        { label: 'Verify no hidden violations of constraint', required: true },
      ]),
    };
  }
}

/**
 * Flow Q: Migration/Refactor (Special)
 * Component API refactoring - dependency mapping, pre/post signoff gates
 */
export class FlowQMigrationHandler extends BaseFlowHandler {
  constructor() {
    super('flowQ_migration_special');
  }

  async execute(context: FlowExecutionContext): Promise<FlowExecutionResult> {
    return {
      flowId: this.flowId,
      flowName: this.getFlowName(),
      status: 'success',
      message: 'Component migration and API refactoring',
      guidance: [
        'Migrations are high-risk: breaking changes affect all consumers',
        'Pre-migration: map all dependencies (grep for component usage)',
        'Define new API clearly before implementation (breaking changes documented)',
        'Implement migration in backward-compatible layer first, then migrate consumers',
        'Post-migration: verify no broken imports, test all consumer code',
        'Signoff gate: both pre and post to catch surprises',
      ],
      checklist: this.createChecklist([
        { label: 'PRE-MIGRATION: Map all component dependencies', required: true },
        { label: 'PRE-MIGRATION: Define new API clearly', required: true },
        { label: 'PRE-MIGRATION: Document all breaking changes', required: true },
        { label: 'PRE-MIGRATION: Signoff from affected teams', required: true },
        { label: 'Implement new API in component', required: true },
        { label: 'Create migration guide for consumers', required: true },
        { label: 'POST-MIGRATION: Test all consumer code', required: true },
        { label: 'POST-MIGRATION: Verify no broken imports', required: true },
        { label: 'POST-MIGRATION: Signoff from affected teams', required: true },
      ]),
    };
  }
}
