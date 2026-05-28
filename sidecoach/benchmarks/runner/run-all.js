#!/usr/bin/env ts-node
"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFlowOnFixture = runFlowOnFixture;
exports.runAll = runAll;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const flow_handler_tactical_polish_1 = require("../../src/flow-handler-tactical-polish");
const flow_handler_multi_lens_audit_1 = require("../../src/flow-handler-multi-lens-audit");
const flow_handler_design_critique_1 = require("../../src/flow-handler-design-critique");
const model_routing_1 = require("../../src/model-routing");
const score_1 = require("./score");
const report_1 = require("./report");
const types_1 = require("./types");
function parseArgs(argv) {
    const args = argv.slice(2);
    let mode = 'compare';
    let fixturesDir = path.resolve(__dirname, '..', 'fixtures');
    let baselinePath;
    const thresholds = { ...types_1.DEFAULT_THRESHOLDS };
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
function printHelp() {
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
const BENCH_FLOWS = [
    { flowId: 'flowJ_tactical_polish', build: () => new flow_handler_tactical_polish_1.FlowJTacticalPolishHandler() },
    { flowId: 'flowK_multi_lens_audit', build: () => new flow_handler_multi_lens_audit_1.FlowKMultiLensAuditHandler() },
    { flowId: 'flowL_design_critique', build: () => new flow_handler_design_critique_1.FlowLDesignCritiqueHandler() },
];
/** Run one flow against one fixture, capture timing + tier + retry state. */
async function runFlowOnFixture(fixture, flowDesc) {
    const handler = flowDesc.build();
    const context = {
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
    (0, model_routing_1.resetLedger)();
    const t0 = Date.now();
    let status = 'success';
    let note;
    let result;
    try {
        result = await handler.execute(context);
        if (result.status === 'error') {
            // T-0009 halt surfaces as status:error with a halt note in the message.
            // We classify those as 'halted' for the schema; other errors as 'error'.
            if (/halt/i.test(result.message) || /halt/i.test(result.error || '')) {
                status = 'halted';
                note = result.message;
            }
            else {
                status = 'error';
                note = result.error || result.message;
            }
        }
        else if (result.status === 'success') {
            status = 'success';
        }
        else if (result.status === 'skipped') {
            status = 'skipped';
        }
        else {
            // 'needs_input' - record as skipped for the schema.
            status = 'skipped';
            note = result.message;
        }
    }
    catch (err) {
        status = 'error';
        note = String(err);
    }
    const latencyMs = Date.now() - t0;
    // Tier comes from context.metadata.selectedModel (set by applyModelSelection
    // at the top of the handler). For halted/error paths it may not be set if
    // the handler crashed BEFORE applyModelSelection - in that case fall back
    // to running applyModelSelection ourselves so the schema is always populated.
    let tierUsed;
    let modelId;
    const selected = context.metadata?.selectedModel;
    if (selected) {
        tierUsed = selected.name;
        modelId = selected.exactModel;
    }
    else {
        const fallback = (0, model_routing_1.applyModelSelection)(flowDesc.flowId, context);
        tierUsed = fallback.name;
        modelId = fallback.exactModel;
    }
    // Retry state count (T-0009).
    const retryStateCount = result?.executionMetadata?.enhancedContext?.retryState?.cycleCount ?? 0;
    // Run the validators directly to get granular per-rule numbers.
    const polishStandard = (0, score_1.scorePolishStandard)(fixture);
    const extendedDomain = (0, score_1.scoreExtendedDomain)(fixture);
    const taste = (0, score_1.scoreTaste)(fixture);
    // T-0016: token-source detection. After the flow ran, check the ledger.
    // If the handler emitted entries matching this flowId, prefer those (live
    // path). Otherwise fall back to the synthetic estimator AND write a single
    // synthetic CostEntry so the ledger shape stays consistent. The output
    // schema is identical either way - only `tokenSource` differs.
    const ledgerAfter = (0, model_routing_1.getSessionLedger)().filter((e) => e.flowId === flowDesc.flowId);
    let tokensInput;
    let tokensOutput;
    let estimatedCost;
    let tokenSource;
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
    }
    else {
        // Synthetic fallback path: handler is rule-based (or pre-LLM-wiring).
        const synth = (0, score_1.estimateSyntheticTokens)(fixture);
        tokensInput = synth.inputTokens;
        tokensOutput = synth.outputTokens;
        // Track a synthetic entry so the ledger shape mirrors the live path.
        // estimatedCost is computed by trackCost from TIERS pricing.
        (0, model_routing_1.trackCost)(flowDesc.flowId, modelId, tokensInput, tokensOutput);
        estimatedCost = (0, model_routing_1.getSessionLedger)()
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
async function runAll(fixturesDir) {
    const fixtureDirs = (0, score_1.discoverFixtures)(fixturesDir);
    if (fixtureDirs.length === 0) {
        throw new Error(`no fixtures found under ${fixturesDir}`);
    }
    const runId = new Date().toISOString();
    const fixtures = [];
    for (const dir of fixtureDirs) {
        const fixture = (0, score_1.loadFixture)(dir);
        const flows = [];
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
            haiku: model_routing_1.TIERS.haiku.exactModel,
            sonnet: model_routing_1.TIERS.sonnet.exactModel,
            opus: model_routing_1.TIERS.opus.exactModel,
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
function computeHarnessVersion() {
    const filesToHash = [
        path.resolve(__dirname, 'run-all.ts'),
        path.resolve(__dirname, 'score.ts'),
        path.resolve(__dirname, 'report.ts'),
    ];
    const hash = crypto.createHash('sha256');
    for (const f of filesToHash) {
        try {
            hash.update(fs.readFileSync(f));
        }
        catch {
            // ignore - production runs from compiled JS may not have ts files.
        }
    }
    return hash.digest('hex').slice(0, 12);
}
// --------------------------------------------------------------------------
// CLI main
// --------------------------------------------------------------------------
async function main() {
    const opts = parseArgs(process.argv);
    const benchmarkRoot = path.resolve(__dirname, '..');
    const paths = (0, report_1.defaultBaselinePaths)(benchmarkRoot);
    if (opts.baselinePath) {
        paths.latest = opts.baselinePath;
    }
    const run = await runAll(opts.fixturesDir);
    if (opts.mode === 'save' || opts.mode === 'save-only') {
        const { latestPath, archivePath } = (0, report_1.saveBaseline)(run, paths);
        if (opts.mode === 'save') {
            console.log((0, report_1.formatSaveSummary)(run, latestPath, archivePath));
            // Also print compare table against previous baseline if one existed.
            // (Saved baseline IS the new one - so loadBaseline would now return it.
            // We skipped that. Print save summary only.)
        }
        else {
            // save-only: write and quietly exit.
            console.log(`baseline saved -> ${latestPath}`);
            console.log(`archived       -> ${archivePath}`);
        }
        process.exit(0);
    }
    // compare-mode.
    const baseline = (0, report_1.loadBaseline)(paths);
    const report = (0, report_1.compareRuns)(baseline, run, opts.thresholds);
    console.log((0, report_1.formatCompareTable)(report));
    process.exit(report.exitCode);
}
if (require.main === module) {
    main().catch((err) => {
        console.error('benchmark harness crashed:', err);
        process.exit(2);
    });
}
//# sourceMappingURL=run-all.js.map