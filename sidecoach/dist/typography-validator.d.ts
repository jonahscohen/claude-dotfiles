/**
 * Typography Validator
 *
 * Operationalizes the absorbed TypeUI typography rules. Pre-wiring these
 * rules lived in `_extracted/external/typeui-fundamentals/typography-principles.md`
 * but no validator consumed them, so violations shipped freely (yesterday's
 * marketing-site had `font-size: 3rem` headings inheriting `line-height: 1.55`
 * from body, a 1.55 ratio on a 51px heading that should be 1.05-1.20).
 *
 * Three rule layers:
 *
 * 1. Modular ratio validation. The project must declare exactly one ratio
 *    token from the enumerated set {1.125, 1.2, 1.25, 1.333, 1.414, 1.5,
 *    1.618}. Every emitted font-size must be derivable from base * ratio^n.
 *    Off-scale sizes fail with a remediation pointing at the nearest
 *    on-scale value.
 *
 * 2. Line-height tier validation. Every heading element with declared
 *    font-size has its line-height checked against the size-tiered range
 *    from TypeUI (body 1.4-1.6, headings 1.05-1.25 tighter as size grows,
 *    UI labels 1.0-1.2, captions 1.3-1.5).
 *
 * 3. Heading-size-by-role validation. h1/major-h2 reserved for display
 *    scale (>=30px). Modal/card titles capped at 18-24px. Inline list
 *    labels capped at smaller.
 *
 * Operates on parsed CSS rules from DomainCheckContext.cssRules. Soft-fails
 * on missing or malformed input - the validator is additive, not gating.
 */
export type TypoFindingSeverity = 'P0' | 'P1' | 'P2';
export interface TypographyFinding {
    severity: TypoFindingSeverity;
    rule: 'modular-ratio' | 'line-height-tier' | 'heading-size-by-role' | 'weight-by-size' | 'font-pairing';
    selector?: string;
    property?: string;
    value?: string;
    expected?: string;
    message: string;
    remediation: string;
}
export interface TypographyReport {
    rulesChecked: number;
    findings: TypographyFinding[];
    passCount: number;
    passRate: string;
    summary: string;
}
interface CssRuleLite {
    selector?: string;
    declarations?: Record<string, string>;
    properties?: {
        property: string;
        value: string;
    }[];
}
export declare const TypographyValidator: {
    validate(ctx: {
        cssRules?: CssRuleLite[];
        designTokens?: any;
    }): TypographyReport;
};
/**
 * Convenience: convert a TypographyReport into guidance lines for a flow.
 */
export declare function typographyFindingsToGuidance(report: TypographyReport): string[];
export {};
//# sourceMappingURL=typography-validator.d.ts.map