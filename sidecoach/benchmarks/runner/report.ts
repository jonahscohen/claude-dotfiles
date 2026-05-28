// T-0013: report formatter for the benchmark harness.
//
// Two modes:
//   - save-mode: write baseline-latest.json (and archive a timestamped copy).
//   - compare-mode: diff a current run against baseline-latest.json, print a
//     human-readable table, return a CompareReport for the caller to inspect.

import * as fs from 'fs';
import * as path from 'path';

import type { FlowId } from '../../src/types';
import type {
  BenchmarkRun,
  CompareDelta,
  CompareReport,
  FlowRunResult,
  RegressionThresholds,
} from './types';
import { DEFAULT_THRESHOLDS } from './types';

// --------------------------------------------------------------------------
// File IO
// --------------------------------------------------------------------------

export interface BaselinePaths {
  latest: string;
  archiveDir: string;
}

export function defaultBaselinePaths(benchmarkRoot: string): BaselinePaths {
  return {
    latest: path.join(benchmarkRoot, 'baselines', 'baseline-latest.json'),
    archiveDir: path.join(benchmarkRoot, 'baselines', 'archive'),
  };
}

/**
 * Write the run to baseline-latest.json AND archive a timestamped copy.
 * Returns the two paths written so the CLI can report them.
 */
export function saveBaseline(run: BenchmarkRun, paths: BaselinePaths): {
  latestPath: string;
  archivePath: string;
} {
  fs.mkdirSync(path.dirname(paths.latest), { recursive: true });
  fs.mkdirSync(paths.archiveDir, { recursive: true });
  // Sanitize the runId for the filename (replace ':' which Windows hates).
  const stamp = run.runId.replace(/[:.]/g, '-');
  const archivePath = path.join(paths.archiveDir, `${stamp}.json`);
  const payload = JSON.stringify(run, null, 2);
  fs.writeFileSync(paths.latest, payload, 'utf-8');
  fs.writeFileSync(archivePath, payload, 'utf-8');
  return { latestPath: paths.latest, archivePath };
}

export function loadBaseline(paths: BaselinePaths): BenchmarkRun | null {
  if (!fs.existsSync(paths.latest)) return null;
  try {
    return JSON.parse(fs.readFileSync(paths.latest, 'utf-8')) as BenchmarkRun;
  } catch (err) {
    throw new Error(`baseline file unreadable at ${paths.latest}: ${String(err)}`);
  }
}

// --------------------------------------------------------------------------
// Compare logic
// --------------------------------------------------------------------------

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
export function compareRuns(
  baseline: BenchmarkRun | null,
  current: BenchmarkRun,
  thresholds: RegressionThresholds = DEFAULT_THRESHOLDS,
): CompareReport {
  const deltas: CompareDelta[] = [];
  let regressionCount = 0;

  // Build a quick lookup: fixture name -> flowId -> result.
  const baselineLookup = new Map<string, Map<FlowId, FlowRunResult>>();
  if (baseline) {
    for (const fix of baseline.fixtures) {
      const flowMap = new Map<FlowId, FlowRunResult>();
      for (const f of fix.flows) flowMap.set(f.flowId, f);
      baselineLookup.set(fix.name, flowMap);
    }
  }

  for (const fix of current.fixtures) {
    const baselineFlows = baselineLookup.get(fix.name);
    for (const flow of fix.flows) {
      const baselineFlow = baselineFlows?.get(flow.flowId) || null;
      const after = {
        passRate: flow.polishStandard.passRate,
        criticalViolations: flow.polishStandard.criticalViolations,
        estimatedCost: flow.estimatedCost,
        tierUsed: flow.tierUsed,
      };
      const before = baselineFlow
        ? {
            passRate: baselineFlow.polishStandard.passRate,
            criticalViolations: baselineFlow.polishStandard.criticalViolations,
            estimatedCost: baselineFlow.estimatedCost,
            tierUsed: baselineFlow.tierUsed,
          }
        : null;

      const reasons: string[] = [];
      let passRateDelta = 0;
      let criticalDelta = 0;
      let costDelta = 0;

      if (before) {
        passRateDelta = after.passRate - before.passRate;
        criticalDelta = after.criticalViolations - before.criticalViolations;
        costDelta = after.estimatedCost - before.estimatedCost;
        if (passRateDelta < -thresholds.passRateDelta) {
          reasons.push(
            `passRate dropped ${(passRateDelta * 100).toFixed(1)}% (threshold ${(thresholds.passRateDelta * 100).toFixed(1)}%)`,
          );
        }
        if (criticalDelta > 0) {
          reasons.push(`criticalViolations +${criticalDelta}`);
        }
        if (
          before.estimatedCost > 0 &&
          costDelta / before.estimatedCost > thresholds.costDeltaRatio &&
          after.tierUsed === before.tierUsed
        ) {
          reasons.push(
            `estimatedCost +${((costDelta / before.estimatedCost) * 100).toFixed(1)}% with no tier change`,
          );
        }
      }

      if (reasons.length > 0) regressionCount += 1;

      deltas.push({
        fixture: fix.name,
        flowId: flow.flowId,
        before,
        after,
        passRateDelta,
        criticalDelta,
        costDelta,
        reasons,
      });
    }
  }

  return {
    baselineRunId: baseline ? baseline.runId : null,
    currentRunId: current.runId,
    thresholds,
    deltas,
    regressionCount,
    exitCode: regressionCount > 0 ? 1 : 0,
  };
}

// --------------------------------------------------------------------------
// Human-readable formatting
// --------------------------------------------------------------------------

/** Render the compare report as a plaintext table for the terminal. */
export function formatCompareTable(report: CompareReport): string {
  const lines: string[] = [];
  lines.push('Sidecoach benchmark compare');
  lines.push('===========================');
  if (report.baselineRunId) {
    lines.push(`Baseline: ${report.baselineRunId}`);
  } else {
    lines.push('Baseline: (none - first run)');
  }
  lines.push(`Current:  ${report.currentRunId}`);
  lines.push(
    `Thresholds: passRate -${(report.thresholds.passRateDelta * 100).toFixed(1)}%, cost +${(report.thresholds.costDeltaRatio * 100).toFixed(1)}% (same-tier only)`,
  );
  lines.push('');

  // Column widths.
  const header = [
    'fixture',
    'flow',
    'tier',
    'passRate',
    'crit',
    'cost',
    'status',
  ];
  const rows: string[][] = [header];
  for (const d of report.deltas) {
    const passRateCol = d.before
      ? `${(d.before.passRate * 100).toFixed(1)}% -> ${(d.after.passRate * 100).toFixed(1)}%`
      : `(new) ${(d.after.passRate * 100).toFixed(1)}%`;
    const critCol = d.before
      ? `${d.before.criticalViolations} -> ${d.after.criticalViolations}`
      : `(new) ${d.after.criticalViolations}`;
    const costCol = d.before
      ? `$${d.before.estimatedCost.toFixed(4)} -> $${d.after.estimatedCost.toFixed(4)}`
      : `(new) $${d.after.estimatedCost.toFixed(4)}`;
    const status = d.reasons.length === 0 ? 'OK' : `REGRESSION: ${d.reasons.join('; ')}`;
    rows.push([
      d.fixture,
      String(d.flowId),
      d.after.tierUsed,
      passRateCol,
      critCol,
      costCol,
      status,
    ]);
  }
  const widths = header.map((_, ci) =>
    rows.reduce((m, r) => Math.max(m, (r[ci] || '').length), 0),
  );
  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];
    const padded = row.map((cell, ci) => (cell || '').padEnd(widths[ci]));
    lines.push(padded.join('  '));
    if (ri === 0) {
      lines.push(widths.map((w) => '-'.repeat(w)).join('  '));
    }
  }
  lines.push('');
  lines.push(
    report.regressionCount === 0
      ? 'Result: PASS (no regressions detected)'
      : `Result: FAIL (${report.regressionCount} regression${report.regressionCount === 1 ? '' : 's'})`,
  );
  return lines.join('\n');
}

/** Render a save-mode summary table (no baseline diff). */
export function formatSaveSummary(run: BenchmarkRun, latestPath: string, archivePath: string): string {
  const lines: string[] = [];
  lines.push('Sidecoach benchmark save');
  lines.push('========================');
  lines.push(`Run: ${run.runId}`);
  lines.push(`Fixtures: ${run.fixtures.length}`);
  lines.push(`Total flows: ${run.totals.flowCount}`);
  lines.push(`Avg pass rate: ${(run.totals.passRateAvg * 100).toFixed(1)}%`);
  lines.push(`Critical violations: ${run.totals.criticalViolations}`);
  lines.push(`Estimated cost: $${run.totals.estimatedCost.toFixed(4)}`);
  lines.push('');
  lines.push('Per-fixture summary:');
  for (const fix of run.fixtures) {
    const avgPassRate =
      fix.flows.reduce((s, f) => s + f.polishStandard.passRate, 0) / Math.max(1, fix.flows.length);
    lines.push(
      `  ${fix.name} (${fix.category}): ${fix.flows.length} flows, avg passRate ${(avgPassRate * 100).toFixed(1)}%`,
    );
  }
  lines.push('');
  lines.push(`Wrote: ${latestPath}`);
  lines.push(`Archived: ${archivePath}`);
  return lines.join('\n');
}
