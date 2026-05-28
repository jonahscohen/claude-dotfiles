#!/usr/bin/env ts-node
// T-0013: benchmark harness entry point.
//
// Usage:
//   ts-node benchmarks/runner/run-all.ts --save         # run + write baseline
//   ts-node benchmarks/runner/run-all.ts --compare      # run + diff baseline, exit 1 on regression
//   ts-node benchmarks/runner/run-all.ts --save-only    # write baseline without diff (skip compare table)
//
// Optional flags:
//   --fixtures-dir <path>     Override fixtures root (default: benchmarks/fixtures)
//   --baseline <path>         Override baseline-latest.json path
//   --pass-rate-delta <0.02>  Override regression threshold for passRate drop
//   --cost-delta-ratio <0.20> Override regression threshold for cost increase
//
// Pattern: OMC's benchmarks/run-all.ts. See benchmarks/README.md for fixture
// taxonomy and schema docs.

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

import { FlowJTacticalPolishHandler } from '../../src/flow-handler-tactical-polish';
import { FlowKMultiLensAuditHandler } from '../../src/flow-handler-multi-lens-audit';
import { FlowLDesignCritiqueHandler } from '../../src/flow-handler-design-critique';
import {
  TIERS,
  resetLedger,
  trackCost,
  getSessionLedger,
  applyModelSelection,
} from '../../src/model-routing';
import type { FlowId } from '../../src/types';
import type { FlowExecutionContext, FlowExecutionResult } from '../../src/flow-handler';
import type { TierName } from '../../src/model-routing';

import {
  loadFixture,
  discoverFixtures,
  scorePolishStandard,
  scoreExtendedDomain,
  scoreTaste,
  estimateSyntheticTokens,
  LoadedFixture,
} from './score';
import {
  defaultBaselinePaths,
  saveBaseline,
  loadBaseline,
  compareRuns,
  formatCompareTable,
  formatSaveSummary,
} from './report';
import type {
  BenchmarkRun,
  CompareReport,
  FixtureRunResult,
  FlowRunResult,
  FlowRunStatus,
  RegressionThresholds,
} from './types';
import { DEFAULT_THRESHOLDS } from './types';

// --------------------------------------------------------------------------
// CLI argument parsing (minimal - no external dependency)
// --------------------------------------------------------------------------

interface CliOptions {
  mode: 'save' | 'compare' | 'save-only';
  fixturesDir: string;
  baselinePath?: string;
  thresholds: RegressionThresholds;
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  let mode: CliOptions['mode'] = 'compare';
  let fixturesDir = path.resolve(__dirname, '..', 'fixtures');
  let baselinePath: string | undefined;
  const thresholds: RegressionThresholds = { ...DEFAULT_THRESHOLDS };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    switch (a) {
      case '--save':
        mode = 'save';
        break;
      case '--compare':
        mode = 'compare';
        break;
      case '--save-only':
        mode = 'save-only';
        break;
      case '--fixtures-dir':
        fixturesDir = path.resolve(args[++i]);
        break;
      case '--baseline':
        baselinePath = path.resolve(args[++i]);
        break;
      case '--pass-rate-delta':
        thresholds.passRateDelta = parseFloat(args[++i]);
        break;
      case '--cost-delta-ratio':
        thresholds.costDeltaRatio = parseFloat(args[++i]);
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        if (a.startsWith('-')) {
          console.error(`unknown flag: ${a}`);
          printHelp();
          process.exit(2);
        }
    }
  }

  return { mode, fixturesDir, baselinePath, thresholds };
}

function printHelp(): void {
  console.log(`sidecoach benchmark harness (T-0013)

Usage:
  ts-node benchmarks/runner/run-all.ts [--save | --compare | --save-only]

Modes:
  --save        Run, save as baseline-latest.json (and archive).
  --compare     Run, diff against baseline-latest.json, exit 1 on regression. (default)
  --save-only   Run, write baseline, skip compare output.

Options:
  --fixtures-dir <path>      Override fixtures root.
  --baseline <path>          Override baseline-latest.json path.
  --pass-rate-delta <0.02>   Pass-rate drop that flags a regression.
  --cost-delta-ratio <0.20>  Cost ratio increase that flags a regression (same-tier only).
  --help, -h                 This help.
`);
}

// --------------------------------------------------------------------------
// Single (fixture, flow) execution
// --------------------------------------------------------------------------

interface FlowDescriptor {
  flowId: FlowId;
  /** Build a handler instance. */
  build: () => { execute: (ctx: FlowExecutionContext) => Promise<FlowExecutionResult> };
}

const BENCH_FLOWS: FlowDescriptor[] = [
  { flowId: 'flowJ_tactical_polish', build: () => new FlowJTacticalPolishHandler() },
  { flowId: 'flowK_multi_lens_audit', build: () => new FlowKMultiLensAuditHandler() },
  { flowId: 'flowL_design_critique', build: () => new FlowLDesignCritiqueHandler() },
];

/** Run one flow against one fixture, capture timing + tier + retry state. */
export async function runFlowOnFixture(
  fixture: LoadedFixture,
  flowDesc: FlowDescriptor,
): Promise<FlowRunResult> {
  const handler = flowDesc.build();
  const context: FlowExecutionContext = {
    utterance: `bench: ${flowDesc.flowId} on ${fixture.name}`,
    projectPath: fixture.dir,
    metadata: {
      designTokens: fixture.designTokens,
      cssRules: fixture.cssRules,
    },
  };

  // T-0016: reset the ledger BEFORE execution so we can detect whether THIS
  // flow's handler emitted any live CostEntry rows. (Previously this reset
  // happened after execution, which would silently discard any live entries
  // a future LLM-wired handler emitted.)
  resetLedger();

  const t0 = Date.now();
  let status: FlowRunStatus = 'success';
  let note: string | undefined;
  let result: FlowExecutionResult | undefined;
  try {
    result = await handler.execute(context);
    if (result.status === 'error') {
      // T-0009 halt surfaces as status:error with a halt note in the message.
      // We classify those as 'halted' for the schema; other errors as 'error'.
      if (/halt/i.test(result.message) || /halt/i.test(result.error || '')) {
        status = 'halted';
        note = result.message;
      } else {
        status = 'error';
        note = result.error || result.message;
      }
    } else if (result.status === 'success') {
      status = 'success';
    } else if (result.status === 'skipped') {
      status = 'skipped';
    } else {
      // 'needs_input' - record as skipped for the schema.
      status = 'skipped';
      note = result.message;
    }
  } catch (err) {
    status = 'error';
    note = String(err);
  }
  const latencyMs = Date.now() - t0;

  // Tier comes from context.metadata.selectedModel (set by applyModelSelection
  // at the top of the handler). For halted/error paths it may not be set if
  // the handler crashed BEFORE applyModelSelection - in that case fall back
  // to running applyModelSelection ourselves so the schema is always populated.
  let tierUsed: TierName;
  let modelId: string;
  const selected = context.metadata?.selectedModel as { name: TierName; exactModel: string } | undefined;
  if (selected) {
    tierUsed = selected.name;
    modelId = selected.exactModel;
  } else {
    const fallback = applyModelSelection(flowDesc.flowId, context);
    tierUsed = fallback.name;
    modelId = fallback.exactModel;
  }

  // Retry state count (T-0009).
  const retryStateCount =
    (result?.executionMetadata?.enhancedContext?.retryState?.cycleCount as number | undefined) ?? 0;

  // Run the validators directly to get granular per-rule numbers.
  const polishStandard = scorePolishStandard(fixture);
  const extendedDomain = scoreExtendedDomain(fixture);
  const taste = scoreTaste(fixture);

  // T-0016: token-source detection. After the flow ran, check the ledger.
  // If the handler emitted entries matching this flowId, prefer those (live
  // path). Otherwise fall back to the synthetic estimator AND write a single
  // synthetic CostEntry so the ledger shape stays consistent. The output
  // schema is identical either way - only `tokenSource` differs.
  const ledgerAfter = getSessionLedger().filter((e) => e.flowId === flowDesc.flowId);
  let tokensInput: number;
  let tokensOutput: number;
  let estimatedCost: number;
  let tokenSource: 'live' | 'synthetic';
  if (ledgerAfter.length > 0) {
    // Live path: handler called trackCost during execute(). Sum the entries.
    tokensInput = ledgerAfter.reduce((s, e) => s + e.inputTokens, 0);
    tokensOutput = ledgerAfter.reduce((s, e) => s + e.outputTokens, 0);
    estimatedCost = ledgerAfter.reduce((s, e) => s + e.estimatedCost, 0);
    // Prefer the model+tier the handler actually invoked over what was selected
    // (a handler could have downgraded mid-call under budget pressure).
    modelId = ledgerAfter[0].model;
    tierUsed = ledgerAfter[0].tier;
    tokenSource = 'live';
  } else {
    // Synthetic fallback path: handler is rule-based (or pre-LLM-wiring).
    const synth = estimateSyntheticTokens(fixture);
    tokensInput = synth.inputTokens;
    tokensOutput = synth.outputTokens;
    // Track a synthetic entry so the ledger shape mirrors the live path.
    // estimatedCost is computed by trackCost from TIERS pricing.
    trackCost(flowDesc.flowId, modelId, tokensInput, tokensOutput);
    estimatedCost = getSessionLedger()
      .filter((e) => e.flowId === flowDesc.flowId)
      .reduce((s, e) => s + e.estimatedCost, 0);
    tokenSource = 'synthetic';
  }

  return {
    flowId: flowDesc.flowId,
    status,
    retryStateCount,
    tierUsed,
    modelId,
    polishStandard,
    extendedDomain,
    taste,
    latencyMs,
    tokensInput,
    tokensOutput,
    estimatedCost,
    tokenSource,
    note,
  };
}

// --------------------------------------------------------------------------
// Top-level run
// --------------------------------------------------------------------------

export async function runAll(fixturesDir: string): Promise<BenchmarkRun> {
  const fixtureDirs = discoverFixtures(fixturesDir);
  if (fixtureDirs.length === 0) {
    throw new Error(`no fixtures found under ${fixturesDir}`);
  }

  const runId = new Date().toISOString();
  const fixtures: FixtureRunResult[] = [];

  for (const dir of fixtureDirs) {
    const fixture = loadFixture(dir);
    const flows: FlowRunResult[] = [];
    for (const flowDesc of BENCH_FLOWS) {
      const result = await runFlowOnFixture(fixture, flowDesc);
      flows.push(result);
    }
    fixtures.push({
      name: fixture.name,
      category: fixture.category,
      flows,
    });
  }

  // Totals.
  let totalCost = 0;
  let totalCritical = 0;
  let passRateSum = 0;
  let flowCount = 0;
  for (const fix of fixtures) {
    for (const flow of fix.flows) {
      totalCost += flow.estimatedCost;
      totalCritical += flow.polishStandard.criticalViolations;
      passRateSum += flow.polishStandard.passRate;
      flowCount += 1;
    }
  }
  const passRateAvg = flowCount > 0 ? passRateSum / flowCount : 0;

  // Harness version - hash of this file + score.ts so baselines invalidate if
  // the scoring changes.
  const harnessVersion = computeHarnessVersion();

  return {
    runId,
    modelTiers: {
      haiku: TIERS.haiku.exactModel,
      sonnet: TIERS.sonnet.exactModel,
      opus: TIERS.opus.exactModel,
    },
    fixtures,
    totals: {
      passRateAvg,
      criticalViolations: totalCritical,
      estimatedCost: totalCost,
      flowCount,
    },
    harnessVersion,
  };
}

function computeHarnessVersion(): string {
  const filesToHash = [
    path.resolve(__dirname, 'run-all.ts'),
    path.resolve(__dirname, 'score.ts'),
    path.resolve(__dirname, 'report.ts'),
  ];
  const hash = crypto.createHash('sha256');
  for (const f of filesToHash) {
    try {
      hash.update(fs.readFileSync(f));
    } catch {
      // ignore - production runs from compiled JS may not have ts files.
    }
  }
  return hash.digest('hex').slice(0, 12);
}

// --------------------------------------------------------------------------
// CLI main
// --------------------------------------------------------------------------

async function main(): Promise<void> {
  const opts = parseArgs(process.argv);
  const benchmarkRoot = path.resolve(__dirname, '..');
  const paths = defaultBaselinePaths(benchmarkRoot);
  if (opts.baselinePath) {
    paths.latest = opts.baselinePath;
  }

  const run = await runAll(opts.fixturesDir);

  if (opts.mode === 'save' || opts.mode === 'save-only') {
    const { latestPath, archivePath } = saveBaseline(run, paths);
    if (opts.mode === 'save') {
      console.log(formatSaveSummary(run, latestPath, archivePath));
      // Also print compare table against previous baseline if one existed.
      // (Saved baseline IS the new one - so loadBaseline would now return it.
      // We skipped that. Print save summary only.)
    } else {
      // save-only: write and quietly exit.
      console.log(`baseline saved -> ${latestPath}`);
      console.log(`archived       -> ${archivePath}`);
    }
    process.exit(0);
  }

  // compare-mode.
  const baseline = loadBaseline(paths);
  const report = compareRuns(baseline, run, opts.thresholds);
  console.log(formatCompareTable(report));
  process.exit(report.exitCode);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('benchmark harness crashed:', err);
    process.exit(2);
  });
}
