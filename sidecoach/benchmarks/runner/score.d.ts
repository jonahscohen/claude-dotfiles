import type { PolishStandardSummary, ExtendedDomainSummary, TasteSummary } from './types';
export interface LoadedFixture {
    name: string;
    category: string;
    dir: string;
    productMd: string;
    designMd: string;
    designTokens: Record<string, any>;
    cssRules: string[];
    htmlContent: string;
    cssContent: string;
}
/**
 * Load a fixture directory. Required files:
 *   - PRODUCT.md
 *   - DESIGN.md
 * Optional files:
 *   - fixture.css (any CSS - extracted into cssRules + cssContent)
 *   - fixture.html (HTML - used for taste validation)
 *   - meta.json (optional; sets `category` taxonomy bucket)
 */
export declare function loadFixture(fixtureDir: string): LoadedFixture;
/** Discover all fixture directories beneath the fixtures root. */
export declare function discoverFixtures(fixturesRoot: string): string[];
/** Run Polish Standard validator on a fixture and produce the summary row. */
export declare function scorePolishStandard(fixture: LoadedFixture): PolishStandardSummary;
/** Run Extended Domain validator on a fixture and produce the summary row. */
export declare function scoreExtendedDomain(fixture: LoadedFixture): ExtendedDomainSummary;
/** Run taste validator on a fixture and produce the summary row. */
export declare function scoreTaste(fixture: LoadedFixture): TasteSummary;
/**
 * Estimate input/output tokens for a benchmark invocation. Used until the flow
 * handlers actually call the Anthropic SDK and produce real token counts.
 *
 * Formula:
 *   inputTokens  = ceil((PRODUCT.md + DESIGN.md + cssContent) bytes / 4)
 *   outputTokens = ceil(inputTokens / 3)   // empirical 3:1 in:out ratio
 *
 * This is intentionally deterministic so the same fixture always produces the
 * same token counts (no noise in compare-mode). When real LLM calls land, the
 * runner will sum the live ledger from trackCost() instead of synthesizing.
 */
export declare function estimateSyntheticTokens(fixture: LoadedFixture): {
    inputTokens: number;
    outputTokens: number;
};
//# sourceMappingURL=score.d.ts.map