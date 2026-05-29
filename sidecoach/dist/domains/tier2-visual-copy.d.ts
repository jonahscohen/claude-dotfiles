import { DomainValidationRule } from '../extended-domain-validator';
export declare const DARK_MODE_RULES: DomainValidationRule[];
export interface ChartTypeGuidance {
    type: string;
    whenToUse: string[];
    whenNotToUse: string[];
    /** Rendering thresholds by data-point count. */
    dataVolume: {
        svgMax: number;
        canvasMax: number;
        aggregateAbove: number;
    };
    /** Native accessibility grade of the chart type (A best, D worst). */
    a11yGrade: 'A' | 'B' | 'C' | 'D';
    /** The mandatory non-visual fallback for this type. */
    fallback: string;
    library: string;
}
export declare const CHART_SELECTION_MATRIX: Record<string, ChartTypeGuidance>;
/** Recommend chart types for a free-text intent. Returns matrix entries ranked by match. */
export declare function recommendChart(intent: string): ChartTypeGuidance[];
export declare const CHART_SELECTION_RULES: DomainValidationRule[];
export declare const TIER2_MOTION_RULES: DomainValidationRule[];
export declare const CHAR_SUBSTITUTION_RULES: DomainValidationRule[];
export declare const COPYWRITING_RULES: DomainValidationRule[];
export declare const TIER2_VISUAL_COPY_RULES: DomainValidationRule[];
//# sourceMappingURL=tier2-visual-copy.d.ts.map