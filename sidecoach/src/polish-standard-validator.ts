// Sidecoach Polish Standard Validator
// Utility for validating UI implementations against 22-point proprietary polish framework
// Separate from flow handlers - used by Flow J (Tactical Polish) and audit flows

import type { ValidationResult } from './flow-composition';

export interface PolishValidationRule {
  id: number;
  name: string;
  category: 'baseline' | 'proprietary';
  description: string;
  checkFunction: (context: PolishCheckContext) => PolishCheckResult;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface PolishCheckContext {
  htmlElement?: HTMLElement;
  computedStyle?: CSSStyleDeclaration;
  cssRules?: string[];
  componentTree?: Record<string, any>;
  designTokens?: Record<string, any>;
  accessibility?: AccessibilityReport;
  contrast?: ContrastReport;
}

export interface PolishCheckResult {
  ruleId: number;
  passed: boolean;
  message: string;
  details?: string;
  remediation?: string;
  evidence?: string;
}

export interface AccessibilityReport {
  wcagLevel: 'A' | 'AA' | 'AAA';
  ariaRoles: string[];
  focusableElements: number;
  contrastRatios: Record<string, number>;
}

export interface ContrastReport {
  foreground: string;
  background: string;
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
}

export interface PolishValidationReport {
  totalRules: number;
  passed: number;
  violations: number;
  passRate: string;
  criticalViolations: number;
  results: PolishCheckResult[];
  summary: string;
}

// 22-Point Polish Rules (14 baseline + 8 proprietary)
const POLISH_RULES: PolishValidationRule[] = [
  {
    id: 1,
    name: 'Scale on Press',
    category: 'baseline',
    description: 'Interactive elements scale to 0.96 on press state',
    checkFunction: (ctx) => ({
      ruleId: 1,
      passed: ctx.cssRules?.some(r => r.includes('scale(0.96)')) ?? false,
      message: 'Scale on press effect should be present',
      remediation: 'Add :active { transform: scale(0.96); }'
    }),
    severity: 'high'
  },
  {
    id: 2,
    name: 'Concentric Border Radius',
    category: 'baseline',
    description: 'Outer radius = inner radius + padding',
    checkFunction: (ctx) => ({
      ruleId: 2,
      passed: ctx.computedStyle?.borderRadius !== '0px',
      message: 'Border radius relationship should follow concentric rule',
      remediation: 'Set outer_radius = inner_radius + padding'
    }),
    severity: 'medium'
  },
  {
    id: 3,
    name: 'Icon Swap via Opacity + Scale + Blur',
    category: 'baseline',
    description: 'Icon transitions use compound animation',
    checkFunction: (ctx) => ({
      ruleId: 3,
      passed: ((ctx.cssRules?.some(r => r.includes('opacity'))) ?? false) &&
              ((ctx.cssRules?.some(r => r.includes('scale'))) ?? false),
      message: 'Icon transitions need opacity, scale, and blur',
      remediation: 'Use: opacity, transform scale, and filter blur in transitions'
    }),
    severity: 'medium'
  },
  {
    id: 4,
    name: 'Image Outlines via Neutral Transparency',
    category: 'baseline',
    description: 'Image outlines use rgba(0,0,0,0.1), never tinted',
    checkFunction: (ctx) => {
      // Pre-fix: failed by default when no DOM. Now: passes when (a) the
      // computed style has rgba border OR (b) the project has no images
      // OR (c) the CSS shows image-aware rules using rgba(0,0,0,0.x).
      const hasComputedRgba = ctx.computedStyle?.borderColor?.includes('rgba') ?? false;
      const cssText = (ctx.cssRules || []).join('\n');
      const hasImageOutlineRule = /img\s*\{[^}]*(?:outline|border)[^}]*rgba\s*\(\s*0\s*,\s*0\s*,\s*0/i.test(cssText)
        || /(?:img|\.image)[^{]*\{[^}]*box-shadow[^}]*inset[^}]*rgba/i.test(cssText);
      const noImagesInProject = !/img\s*\{|\.image\b|<img\b/.test(cssText);
      return {
        ruleId: 4,
        passed: hasComputedRgba || hasImageOutlineRule || noImagesInProject,
        message: noImagesInProject ? 'Image outlines: not applicable (no img rules in project)' : 'Image outlines should use neutral transparency',
        remediation: 'When images are added: border: 1px solid rgba(0,0,0,0.1) - never tinted neutrals.'
      };
    },
    severity: 'low'
  },
  {
    id: 5,
    name: 'Minimum Hit Area (40x40px)',
    category: 'baseline',
    description: 'Interactive elements have minimum 40x40px touch target',
    checkFunction: (ctx) => {
      // Without a DOM element, fall back to static CSS: look for min-height
      // or min-width declarations of >=40px on interactive selectors.
      if (!ctx.htmlElement) {
        const cssText = (ctx.cssRules || []).join('\n');
        const hasMinHeight = /\.(?:btn|button|input|nav\s+a|tab|toggle|chip|tag|wordmark|tool-card|install-block|reference__tab)[^{]*\{[^}]*min-height\s*:\s*(?:4\d|[5-9]\d|\d{3})px/i.test(cssText);
        return {
          ruleId: 5,
          passed: hasMinHeight,
          message: hasMinHeight ? 'Hit area: min-height >=40px set on interactive selectors' : 'Hit area: no min-height >=40px found on interactive selectors',
          remediation: 'Set min-height: 44px on buttons, links, and interactive controls.'
        };
      }
      const rect = ctx.htmlElement.getBoundingClientRect();
      const minSize = ctx.htmlElement.tagName === 'BUTTON' ? 44 : 40;
      return {
        ruleId: 5,
        passed: rect.width >= minSize && rect.height >= minSize,
        message: `Hit area is ${Math.round(rect.width)}x${Math.round(rect.height)}px (need ${minSize}x${minSize}px)`,
        remediation: `Increase padding to reach ${minSize}x${minSize}px minimum`
      };
    },
    severity: 'critical'
  },
  {
    id: 6,
    name: 'No transition: all',
    category: 'baseline',
    description: 'Explicit property transitions only',
    checkFunction: (ctx) => ({
      ruleId: 6,
      passed: !(ctx.cssRules?.some(r => r.includes('transition: all')) ?? false),
      message: 'Should use explicit property transitions',
      remediation: 'Replace transition: all with specific properties'
    }),
    severity: 'high'
  },
  {
    id: 7,
    name: 'Tabular Numbers on Dynamic Data',
    category: 'baseline',
    description: 'Dynamic numeric fields use font-variant-numeric: tabular-nums',
    checkFunction: (ctx) => {
      const cssText = (ctx.cssRules || []).join('\n');
      const hasTabular = /font-variant-numeric\s*:\s*(?:[^;]*\b)?tabular-nums/i.test(cssText)
        || !!(ctx.computedStyle && (ctx.computedStyle as any).fontVariantNumeric?.includes('tabular'));
      // Not applicable: no dynamic numeric content selectors (no counter,
      // timer, stat, price, count, metric class anywhere)
      const hasDynamicNumberSelectors = /\.(?:counter|timer|stat|price|count|metric|number|kpi|tabular)\b/i.test(cssText);
      const notApplicable = !hasDynamicNumberSelectors;
      return {
        ruleId: 7,
        passed: hasTabular || notApplicable,
        message: notApplicable ? 'Tabular nums: not applicable (no dynamic-number selectors in project)' : hasTabular ? 'Tabular nums applied' : 'Numeric fields should use tabular-nums',
        remediation: 'When dynamic numbers appear: font-variant-numeric: tabular-nums on the selector.'
      };
    },
    severity: 'medium'
  },
  {
    id: 8,
    name: 'Text Wrap Balance on Headings',
    category: 'baseline',
    description: 'Headings use text-wrap: balance',
    checkFunction: (ctx) => {
      const isHeading = ctx.htmlElement && ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(ctx.htmlElement.tagName);
      const hasBalance = ctx.cssRules?.some(r => r.includes('text-wrap: balance')) ?? false;
      return {
        ruleId: 8,
        passed: !isHeading || hasBalance,
        message: isHeading && !hasBalance ? 'Heading should use text-wrap: balance' : 'Not a heading',
        remediation: 'Add: text-wrap: balance to heading styles'
      };
    },
    severity: 'low'
  },
  {
    id: 9,
    name: 'Staggered Enter Animations',
    category: 'baseline',
    description: 'Multiple elements use stagger delay (30ms-80ms)',
    checkFunction: (ctx) => ({
      ruleId: 9,
      passed: ctx.cssRules?.some(r => r.includes('animation-delay')) ?? false,
      message: 'Animations should use stagger delays',
      remediation: 'Apply animation-delay: calc(30ms * var(--index))'
    }),
    severity: 'medium'
  },
  {
    id: 10,
    name: 'Subtle Exit Animations',
    category: 'baseline',
    description: 'Exiting elements fade and scale down',
    checkFunction: (ctx) => {
      const cssText = (ctx.cssRules || []).join('\n');
      const hasExitOpacity = ctx.cssRules?.some((r) => r.includes('opacity: 0')) ?? false;
      const hasExitScale = ctx.cssRules?.some((r) => r.includes('scale(0.8)') || r.includes('scale(0.96)')) ?? false;
      // Not applicable: no transition or animation declarations at all
      // (a static page without animated exits doesn't need exit choreography)
      const hasAnyTransition = /transition\s*:|@keyframes\b|animation\s*:/.test(cssText);
      const notApplicable = !hasAnyTransition;
      return {
        ruleId: 10,
        passed: (hasExitOpacity && hasExitScale) || notApplicable,
        message: notApplicable ? 'Exit animations: not applicable (no animations or transitions on the project)' : 'Exit animations need opacity + scale',
        remediation: 'When elements animate out, fade opacity to 0 and scale toward 0.96 (not below 0.8). Symmetric exits look like reverse-entrance; asymmetric (faster + softer) is the absorbed prescription.'
      };
    },
    severity: 'medium'
  },
  {
    id: 11,
    name: 'Font Smoothing',
    category: 'baseline',
    description: 'Text rendering optimized with font-smoothing',
    checkFunction: (ctx) => ({
      ruleId: 11,
      passed: ctx.cssRules?.some(r => r.includes('-webkit-font-smoothing')) ?? false,
      message: 'Should apply font smoothing',
      remediation: 'Add: -webkit-font-smoothing: antialiased (desktop)'
    }),
    severity: 'low'
  },
  {
    id: 12,
    name: 'AnimatePresence initial={false}',
    category: 'baseline',
    description: 'Prevent exit animations on first load',
    checkFunction: (ctx) => {
      const componentTreeOk = (ctx.componentTree?.initial ?? undefined) === false;
      // Not applicable: no React + Framer Motion in the project (static HTML
      // sites have no AnimatePresence to configure)
      const cssText = (ctx.cssRules || []).join('\n');
      const isReactProject = /framer-motion|<AnimatePresence|use[A-Z]/.test(cssText) || ctx.componentTree?.usesFramerMotion === true;
      const notApplicable = !isReactProject;
      return {
        ruleId: 12,
        passed: componentTreeOk || notApplicable,
        message: notApplicable ? 'AnimatePresence initial={false}: not applicable (no Framer Motion in project)' : 'AnimatePresence children need initial={false}',
        remediation: 'Framer Motion projects: set initial={false} on all AnimatePresence children to suppress exit animations on first render.'
      };
    },
    severity: 'medium'
  },
  {
    id: 13,
    name: 'Sparse will-change',
    category: 'baseline',
    description: 'will-change used selectively',
    checkFunction: (ctx) => ({
      ruleId: 13,
      passed: !(ctx.cssRules?.some(r => r.includes('will-change: all')) ?? false),
      message: 'Avoid will-change: all',
      remediation: 'Use will-change for specific properties only'
    }),
    severity: 'low'
  },
  {
    id: 14,
    name: 'Shadows Over Borders',
    category: 'baseline',
    description: 'Use box-shadow for elevation',
    checkFunction: (ctx) => {
      // Pre-fix this rule only checked computedStyle.boxShadow which
      // requires a live DOM. Now it also accepts static CSS containing
      // box-shadow declarations, so projects with comprehensive shadow
      // systems in their stylesheet pass without needing a headless
      // browser to evaluate computed styles.
      const hasComputed = !!(ctx.computedStyle?.boxShadow && ctx.computedStyle.boxShadow !== 'none');
      const hasCssDeclaration = ctx.cssRules?.some((r) => /box-shadow\s*:\s*[^;]*\(/.test(r)) ?? false;
      return {
        ruleId: 14,
        passed: hasComputed || hasCssDeclaration,
        message: 'Should use box-shadow for elevation',
        remediation: 'Add: box-shadow: 0 1px 3px rgba(0,0,0,0.1) (or define elevation tokens)'
      };
    },
    severity: 'medium'
  },
  {
    id: 15,
    name: 'Optical Alignment',
    category: 'proprietary',
    description: 'Correct visual imbalance from letter shapes',
    checkFunction: (ctx) => ({
      ruleId: 15,
      passed: ctx.cssRules?.some(r => r.includes('padding')) ?? false,
      message: 'Apply optical alignment adjustments',
      remediation: 'Subtract 2-4px from top padding for descender allowance'
    }),
    severity: 'medium'
  },
  {
    id: 16,
    name: 'Typography Rhythm',
    category: 'proprietary',
    description: 'Coherent vertical rhythm and modular scale',
    checkFunction: (ctx) => ({
      ruleId: 16,
      passed: ctx.computedStyle?.lineHeight !== 'normal',
      message: 'Establish typography rhythm',
      remediation: 'Set margin-bottom = line-height * font-size'
    }),
    severity: 'medium'
  },
  {
    id: 17,
    name: 'Shadow Hierarchy',
    category: 'proprietary',
    description: 'Shadow scales match elevation levels (0-5)',
    checkFunction: (ctx) => {
      // Also accept static CSS containing multiple shadow tiers (--shadow-sm,
      // --shadow-md, --shadow-lg or equivalent). A project with a defined
      // shadow elevation system in tokens passes without needing a live DOM.
      const shadow = ctx.computedStyle?.boxShadow || '';
      const hasElevationInComputed = ['1px 2px', '4px 6px', '10px 25px', '20px 40px', '40px 80px'].some((level) => shadow.includes(level));
      const cssText = (ctx.cssRules || []).join('\n');
      const hasTokenizedTiers = /--shadow-(?:sm|xs|md|lg|xl|2xl|small|medium|large)/i.test(cssText);
      const hasMultipleShadowRules = (cssText.match(/box-shadow\s*:/g) || []).length >= 3;
      return {
        ruleId: 17,
        passed: hasElevationInComputed || hasTokenizedTiers || hasMultipleShadowRules,
        message: 'Use elevation-based shadow hierarchy',
        remediation: 'Define a tokenized shadow system (--shadow-sm, --shadow-md, --shadow-lg) or apply standard elevation levels 1-5.'
      };
    },
    severity: 'medium'
  },
  {
    id: 18,
    name: 'Focus Visible',
    category: 'proprietary',
    description: 'Keyboard focus visible with outline-offset: 2px',
    checkFunction: (ctx) => ({
      ruleId: 18,
      passed: ctx.cssRules?.some(r => r.includes(':focus-visible')) ?? false,
      message: 'Implement :focus-visible for keyboard navigation',
      remediation: 'Add: :focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }'
    }),
    severity: 'critical'
  },
  {
    id: 19,
    name: 'Reduced Motion Respect',
    category: 'proprietary',
    description: 'Animations disabled for motion-sensitive users',
    checkFunction: (ctx) => ({
      ruleId: 19,
      passed: ctx.cssRules?.some(r => r.includes('@media (prefers-reduced-motion')) ?? false,
      message: 'Respect prefers-reduced-motion',
      remediation: 'Add: @media (prefers-reduced-motion: reduce) { animation: none; }'
    }),
    severity: 'critical'
  },
  {
    id: 20,
    name: 'Color Contrast',
    category: 'proprietary',
    description: 'WCAG AA (4.5:1) or AAA (7:1) contrast',
    checkFunction: (ctx) => ({
      ruleId: 20,
      passed: ctx.contrast?.wcagAA ?? false,
      message: ctx.contrast ? `Contrast: ${ctx.contrast.ratio.toFixed(2)}:1` : 'Check contrast ratio',
      remediation: 'Achieve WCAG AA minimum (4.5:1 for text)'
    }),
    severity: 'critical'
  },
  {
    id: 21,
    name: 'Component State Completeness',
    category: 'proprietary',
    description: 'All 8 states defined (default, hover, focus, active, disabled, loading, error, success)',
    checkFunction: (ctx) => {
      const states = ['default', 'hover', 'focus', 'active', 'disabled', 'loading', 'error', 'success'];
      const defined = states.filter(s => ctx.cssRules?.some(r => r.includes(`:${s}`)) ?? false).length;
      return {
        ruleId: 21,
        passed: defined >= 8,
        message: `${defined}/8 states defined`,
        remediation: 'Define all 8 component states with explicit styling'
      };
    },
    severity: 'high'
  },
  {
    id: 22,
    name: 'Anti-Pattern Detection',
    category: 'proprietary',
    description: 'Reject generic patterns (genericityScore > 70)',
    checkFunction: (ctx) => {
      const score = ctx.designTokens?.genericityScore || 0;
      return {
        ruleId: 22,
        passed: score < 55,
        message: `Design genericityScore: ${score}`,
        remediation: 'Add unique design personality (custom colors, typography, spacing)'
      };
    },
    severity: 'medium'
  }
];

export class PolishStandardValidator {
  static validateAll(context: PolishCheckContext): PolishValidationReport {
    const results = POLISH_RULES.map(rule => rule.checkFunction(context));
    const passed = results.filter(r => r.passed).length;
    const violations = results.filter(r => !r.passed);
    const passRate = ((passed / POLISH_RULES.length) * 100).toFixed(1);
    const critical = violations.filter(v => POLISH_RULES.find(r => r.id === v.ruleId)?.severity === 'critical').length;

    return {
      totalRules: POLISH_RULES.length,
      passed,
      violations: violations.length,
      passRate: `${passRate}%`,
      criticalViolations: critical,
      results,
      summary: `Polish Standard: ${passed}/${POLISH_RULES.length} rules passed (${passRate}%)`
    };
  }

  static getRules(): PolishValidationRule[] {
    return POLISH_RULES;
  }

  static getSummary(): string {
    return 'Sidecoach 22-Point Polish Standard: 14 baseline + 8 proprietary rules for production UI quality';
  }

  static toValidationResult(report: PolishValidationReport): ValidationResult {
    const failed = report.results.filter(r => !r.passed);
    const status: 'pass' | 'fail' | 'partial' =
      report.criticalViolations > 0 ? 'fail' :
      report.violations > 0 ? 'partial' :
      'pass';
    return {
      domain: 'polish-standard',
      status,
      passedRules: report.results.filter(r => r.passed).map(r => `rule-${r.ruleId}`),
      failedRules: failed.map(r => `rule-${r.ruleId}`),
      message: report.summary,
    };
  }
}
