import type { BenchmarkRun, CompareReport, RegressionThresholds } from './types';
export interface BaselinePaths {
    latest: string;
    archiveDir: string;
}
export declare function defaultBaselinePaths(benchmarkRoot: string): BaselinePaths;
/**
 * Write the run to baseline-latest.json AND archive a timestamped copy.
 * Returns the two paths written so the CLI can report them.
 */
export declare function saveBaseline(run: BenchmarkRun, paths: BaselinePaths): {
    latestPath: string;
    archivePath: string;
};
export declare function loadBaseline(paths: BaselinePaths): BenchmarkRun | null;
/**
 * Diff a current run against a baseline. Returns a CompareReport with per-
 * (fixture, flow) deltas and an exitCode (0 = no regression, 1 = regression).
 *
 * Regression triggers (any one trips it):
 *   - passRate dropped > thresholds.passRateDelta (default 2%)
 *   - criticalViolations increased
 *   - estimatedCost increased > thresholds.costDeltaRatio AND tierUsed unchanged
 *     (a tier upgrade legitimately costs more - don't flag those)
 */
export declare function compareRuns(baseline: BenchmarkRun | null, current: BenchmarkRun, thresholds?: RegressionThresholds): CompareReport;
/** Render the compare report as a plaintext table for the terminal. */
export declare function formatCompareTable(report: CompareReport): string;
/** Render a save-mode summary table (no baseline diff). */
export declare function formatSaveSummary(run: BenchmarkRun, latestPath: string, archivePath: string): string;
//# sourceMappingURL=report.d.ts.map