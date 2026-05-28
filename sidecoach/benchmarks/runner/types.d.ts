import type { FlowId } from '../../src/types';
import type { TierName } from '../../src/model-routing';
export interface PolishStandardSummary {
    passed: number;
    failed: number;
    passRate: number;
    criticalViolations: number;
}
export interface ExtendedDomainSummary {
    passed: number;
    failed: number;
    passRate: number;
    byDomain?: Record<string, {
        passed: number;
        failed: number;
        passRate: number;
    }>;
}
export interface TasteViolationLite {
    ruleId: string;
    severity: string;
    category: string;
    message: string;
}
export interface TasteSummary {
    violations: TasteViolationLite[];
}
export type FlowRunStatus = 'success' | 'halted' | 'error' | 'skipped';
export interface FlowRunResult {
    flowId: FlowId;
    status: FlowRunStatus;
    retryStateCount: number;
    tierUsed: TierName;
    modelId: string;
    polishStandard: PolishStandardSummary;
    extendedDomain: ExtendedDomainSummary;
    taste: TasteSummary;
    latencyMs: number;
    tokensInput: number;
    tokensOutput: number;
    estimatedCost: number;
    /**
     * T-0016: source of the token counts + cost numbers on this row.
     *
     * - `'live'`    - the flow handler invoked `trackCost(...)` during execute(),
     *                 so the numbers are summed from real ledger entries.
     * - `'synthetic'` - the handler emitted no ledger entries (rule-based or
     *                   no LLM call yet), so the runner fell back to the
     *                   `Buffer.byteLength/4` synthetic estimator and wrote a
     *                   single synthetic CostEntry to keep the ledger shape stable.
     *
     * Today (2026-05-28) every flow is `'synthetic'`; this field is the visible
     * switch that flips automatically the moment handlers start emitting real
     * CostEntry rows.
     */
    tokenSource: 'live' | 'synthetic';
    note?: string;
}
export interface FixtureRunResult {
    name: string;
    category: string;
    flows: FlowRunResult[];
}
export interface RunTotals {
    passRateAvg: number;
    criticalViolations: number;
    estimatedCost: number;
    flowCount: number;
}
export interface ModelTiersUsed {
    haiku: string;
    sonnet: string;
    opus: string;
}
export interface BenchmarkRun {
    runId: string;
    modelTiers: ModelTiersUsed;
    fixtures: FixtureRunResult[];
    totals: RunTotals;
    harnessVersion: string;
}
export interface RegressionThresholds {
    /** Pass-rate drop that counts as a regression (default 0.02 = 2%). */
    passRateDelta: number;
    /** Estimated-cost increase ratio that flags when tier didn't change (default 0.20 = 20%). */
    costDeltaRatio: number;
}
export declare const DEFAULT_THRESHOLDS: RegressionThresholds;
export interface CompareDelta {
    fixture: string;
    flowId: FlowId;
    before: {
        passRate: number;
        criticalViolations: number;
        estimatedCost: number;
        tierUsed: TierName;
    } | null;
    after: {
        passRate: number;
        criticalViolations: number;
        estimatedCost: number;
        tierUsed: TierName;
    };
    passRateDelta: number;
    criticalDelta: number;
    costDelta: number;
    reasons: string[];
}
export interface CompareReport {
    baselineRunId: string | null;
    currentRunId: string;
    thresholds: RegressionThresholds;
    deltas: CompareDelta[];
    regressionCount: number;
    exitCode: 0 | 1;
}
//# sourceMappingURL=types.d.ts.map