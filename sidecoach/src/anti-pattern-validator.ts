// Task #23: Anti-Pattern Validator
// Validates code against 27 deterministic anti-patterns with severity scoring
// Used by audit flows (K, L, V) to detect design violations

import { ANTI_PATTERNS } from './design-laws';

export interface AntiPatternViolation {
  patternId: string;
  patternName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  line?: number;
  column?: number;
  match?: string;
  fix?: string;
}

export interface ValidationResult {
  totalViolations: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  violations: AntiPatternViolation[];
  score: number; // 0-100, where 100 is no violations
  recommendations: string[];
}

export class AntiPatternValidator {
  /**
   * Validate code/design against all 27 anti-patterns
   * Returns violations organized by severity with score
   */
  validateCode(code: string): ValidationResult {
    const violations: AntiPatternViolation[] = [];
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;

    // Test against each anti-pattern
    for (const [key, pattern] of Object.entries(ANTI_PATTERNS)) {
      if (pattern.checker(code)) {
        const violation: AntiPatternViolation = {
          patternId: pattern.id,
          patternName: pattern.name,
          severity: pattern.severity as 'critical' | 'high' | 'medium' | 'low',
          match: this.extractMatch(code, pattern.name),
          fix: this.getSuggestedFix(pattern.name),
        };

        violations.push(violation);

        if (pattern.severity === 'critical') criticalCount++;
        else if (pattern.severity === 'high') highCount++;
        else if (pattern.severity === 'medium') mediumCount++;
      }
    }

    // Calculate score: 0-100 with penalties
    // Critical: -10 each, High: -5 each, Medium: -2 each
    const score = Math.max(
      0,
      100 - criticalCount * 10 - highCount * 5 - mediumCount * 2
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      violations,
      score
    );

    return {
      totalViolations: violations.length,
      criticalCount,
      highCount,
      mediumCount,
      violations: violations.sort(
        (a, b) =>
          this.severityRank(b.severity) - this.severityRank(a.severity)
      ),
      score,
      recommendations,
    };
  }

  /**
   * Validate specific CSS or design properties
   */
  validateCSS(css: string): ValidationResult {
    return this.validateCode(css);
  }

  /**
   * Validate JSX/HTML markup
   */
  validateMarkup(markup: string): ValidationResult {
    return this.validateCode(markup);
  }

  /**
   * Check if code passes anti-pattern validation
   */
  passes(code: string): boolean {
    const result = this.validateCode(code);
    return result.criticalCount === 0 && result.highCount === 0;
  }

  /**
   * Get violations of specific severity
   */
  violationsBySeverity(
    code: string,
    severity: 'critical' | 'high' | 'medium' | 'low'
  ): AntiPatternViolation[] {
    const result = this.validateCode(code);
    return result.violations.filter((v) => v.severity === severity);
  }

  /**
   * Get report for specific pattern
   */
  reportForPattern(
    code: string,
    patternId: string
  ): AntiPatternViolation | undefined {
    const result = this.validateCode(code);
    return result.violations.find((v) => v.patternId === patternId);
  }

  /**
   * Batch validate multiple code blocks
   */
  validateBatch(
    codeBlocks: Record<string, string>
  ): Record<string, ValidationResult> {
    const results: Record<string, ValidationResult> = {};
    for (const [name, code] of Object.entries(codeBlocks)) {
      results[name] = this.validateCode(code);
    }
    return results;
  }

  /**
   * Get summary statistics across all patterns
   */
  getPatternStats(code: string): Record<string, number> {
    const stats: Record<string, number> = {};
    const result = this.validateCode(code);

    for (const violation of result.violations) {
      const name = violation.patternName.replace(/\s+/g, '_').toLowerCase();
      stats[name] = (stats[name] || 0) + 1;
    }

    return stats;
  }

  // Private helper methods

  private extractMatch(code: string, patternName: string): string {
    // Extract a small snippet showing the violation
    const patterns: Record<string, RegExp> = {
      'Side-stripe borders': /border-(left|right):\s*\d+px/,
      'Gradient text': /background-clip:\s*text/,
      'Glassmorphism as default': /backdrop-filter:|backdropFilter:/,
      'Hero-metric template': /hero|metric/i,
      'Identical card grids': /grid|repeat.*card/i,
      'Modal as first thought': /modal|dialog/i,
      'Flat typography scales': /font-size|--fs-/,
      'Body text exceeds 75ch': /max-width|width.*\d{3,}/i,
      'Pure black or white': /#000000|#fff|#ffffff/,
      'Alpha as design substitute': /rgba\(.*,\s*0\.[1-4]\)/,
      'WCAG contrast failure': /contrast|wcag/i,
      'Inconsistent spacing rhythm': /padding:|margin:|gap:/,
      'Nested cards': /card.*card|nested/i,
      'Cluttered information hierarchy': /cluttered|busy/i,
      'No breathing room': /margin|padding/,
      'Sans + serif mix': /font-family.*sans.*serif|font-family.*serif.*sans/i,
      'Overlapping text': /overlap|z-index.*\d+/,
      'Orphaned single words': /orphan|widows/i,
      'Ease.out on entrance': /ease-out|easeOut|cubic-bezier.*0\..*0\./,
      'No reduced-motion support': /prefers-reduced-motion/i,
      'Click targets <40x40px': /width:\s*(?:1\d|[1-3]\d)px|height:\s*(?:1\d|[1-3]\d)px/,
      'Missing focus states': /focus|:focus/,
      'No feedback on state change': /active|:active|disabled/,
      'Fixed pixel dimensions on mobile': /@media.*fixed|width:\s*\d+px/,
      'Empty states not designed': /empty|no.*data/i,
      'Loading states missing': /loading|loader|spinner/i,
      'Direct copy from reference': /generic|copy|reference/i,
    };

    const regex = patterns[patternName];
    if (regex) {
      const match = code.match(regex);
      return match ? match[0].substring(0, 50) : patternName;
    }

    return patternName;
  }

  private getSuggestedFix(patternName: string): string {
    const fixes: Record<string, string> = {
      'Side-stripe borders': 'Use border-bottom or box-shadow instead of side borders',
      'Gradient text': 'Use gradient on background element instead of text itself',
      'Glassmorphism as default':
        'Reserve glassmorphism for overlay/modal contexts only',
      'Hero-metric template': 'Vary card layouts, use asymmetric proportions',
      'Identical card grids': 'Create visual hierarchy with varied card sizes',
      'Modal as first thought': 'Try inline expansion, progressive disclosure, or sidebar',
      'Flat typography scales': 'Increase size ratio between steps (target 1.25+)',
      'Body text exceeds 75ch': 'Constrain paragraph width to max 66-75 characters',
      'Pure black or white': 'Use tinted neutrals (#f5f5f5, #1a1a1a) instead',
      'Alpha as design substitute': 'Build proper color palette with semantic colors',
      'WCAG contrast failure': 'Increase text/UI contrast to 4.5:1 (AA) or 3:1 minimum',
      'Inconsistent spacing rhythm': 'Use 4pt/8pt/16pt modular system consistently',
      'Nested cards': 'Flatten hierarchy or use borders instead of nested cards',
      'Cluttered information hierarchy': 'Remove 30% of visual elements, increase whitespace',
      'No breathing room': 'Add minimum 16px padding/margin around content',
      'Sans + serif mix': 'Pair serif heading with sans body (or same family)',
      'Overlapping text': 'Increase line-height or letter-spacing for clarity',
      'Orphaned single words': 'Use text-wrap: balance on headings',
      'Ease.out on entrance': 'Use cubic-bezier(0.25, 0.46, 0.45, 0.94) on entrance',
      'No reduced-motion support': 'Add @media (prefers-reduced-motion) with instant alternatives',
      'Click targets <40x40px': 'Ensure all interactive elements are 40x40px minimum',
      'Missing focus states': 'Add visible focus ring or outline on all focusable elements',
      'No feedback on state change': 'Add visual feedback for hover, active, disabled states',
      'Fixed pixel dimensions on mobile': 'Use relative units (rem, %) and media queries',
      'Empty states not designed': 'Design for 0 data state with helpful messaging',
      'Loading states missing': 'Add spinner/skeleton loader during data fetching',
      'Direct copy from reference': 'Adapt reference to match project register and brand',
    };

    return fixes[patternName] || 'Review design against anti-pattern guidelines';
  }

  private generateRecommendations(
    violations: AntiPatternViolation[],
    score: number
  ): string[] {
    const recommendations: string[] = [];

    if (score >= 90) {
      recommendations.push('✓ Excellent anti-pattern score');
    } else if (score >= 70) {
      recommendations.push('⚠️  Minor anti-pattern violations detected - review suggestions');
    } else if (score >= 50) {
      recommendations.push('⚠️  Moderate anti-pattern violations - prioritize high/critical fixes');
    } else {
      recommendations.push('⚠️  Severe anti-pattern violations - major refactor recommended');
    }

    // Add specific recommendations
    const criticalViolations = violations.filter((v) => v.severity === 'critical');
    const highViolations = violations.filter((v) => v.severity === 'high');

    if (criticalViolations.length > 0) {
      recommendations.push(
        `Fix ${criticalViolations.length} CRITICAL issue(s): ${criticalViolations
          .map((v) => v.patternName)
          .join(', ')}`
      );
    }

    if (highViolations.length > 0) {
      recommendations.push(
        `Address ${highViolations.length} HIGH-severity issue(s) for accessibility and usability`
      );
    }

    if (violations.length === 0) {
      recommendations.push('✓ No anti-patterns detected - design follows best practices');
    }

    return recommendations;
  }

  private severityRank(severity: string): number {
    const ranks: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };
    return ranks[severity] || 0;
  }
}

export function createAntiPatternValidator(): AntiPatternValidator {
  return new AntiPatternValidator();
}
