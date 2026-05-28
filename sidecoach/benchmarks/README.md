# Sidecoach benchmarks

Empirical benchmark harness for sidecoach. Measures quality drift over time on a fixed fixture set, not just correctness. Saves baselines, diffs future runs against them, catches regressions before they ship.

Pattern: OMC's `benchmarks/run-all.ts` with save-baseline + compare commands. Filed as T-0013.

## Quick start

```sh
# From sidecoach/:
npm run bench               # run + save as baseline-latest.json
npm run bench:compare       # run, diff against baseline, exit 1 on regression
npm run bench:save-baseline # write baseline without printing the compare table
```

Output baselines live at:
- `benchmarks/baselines/baseline-latest.json` - last saved
- `benchmarks/baselines/archive/<timestamp>.json` - historical

## Fixture taxonomy

Each fixture is a directory under `benchmarks/fixtures/<name>/` with at minimum:
- `PRODUCT.md` - register + brand personality + anti-references
- `DESIGN.md` - Google design.md spec with YAML frontmatter tokens

Optional:
- `fixture.css` - sample CSS exercised by the polish/extended-domain validators
- `fixture.html` - sample HTML exercised by the taste validator
- `meta.json` - taxonomy bucket (`category`) + free-form notes

Five starter fixtures, one per taxonomy bucket:

| Fixture | Category | Emphasis | What it stresses |
|---|---|---|---|
| `brand-studio` | brand | typography | Editorial register, restrained palette, serif display |
| `saas-dashboard` | product | layout-density | Dense product UI, tabular figures, keyboard targets |
| `scroll-landing` | motion | scroll-driven-animation | Lenis + ScrollTrigger reveals, reduced-motion gates |
| `form-stress` | accessibility | wcag-aa-forms | WCAG AA contrast, 44px targets, focus rings, error patterns |
| `mixed-portfolio` | mixed | register-aware-tokens | One token system across two registers (marketing + dashboard) |

To add a fixture: create a directory with PRODUCT.md and DESIGN.md, optionally CSS/HTML, and meta.json with a category. The runner auto-discovers any directory under `fixtures/` that contains a PRODUCT.md.

## What the runner does

For each fixture, the runner invokes three flow handlers (J/K/L: tactical polish, multi-lens audit, design critique). For each (fixture, flow) pair it:

1. Builds an execution context pointing at the fixture directory.
2. Calls the handler; captures status, tier (from `applyModelSelection`), retry-state count (T-0009), latency.
3. Runs three validators directly on the fixture:
   - **Polish Standard** (22 rules, 14 baseline + 8 proprietary) - `polish-standard-validator.ts`
   - **Extended Domain** (137 rules across 10 design domains) - `extended-domain-validator.ts`
   - **Taste** (structural slop detection) - `taste-validator.ts`
4. Resolves token usage + cost via the **token-source detection** described below.

The handlers themselves don't call an LLM today - they run rule-based checklists. The runner is already ledger-aware (T-0016), so the moment a handler starts calling `trackCost(...)` during `execute()`, the baseline JSON will reflect real numbers without any further code change.

## Token source

Every flow row in the output JSON carries a `tokenSource` field with one of two values:

- `"live"` - the flow handler called `trackCost(flowId, model, in, out)` during `execute()`. The runner sums all CostEntry rows matching that flowId from the session ledger, uses the entry's `model` + `tier` directly, and the cost is whatever `trackCost` computed from `TIERS` pricing.
- `"synthetic"` - the handler emitted no ledger entries. The runner falls back to the byte-length estimator (`(PRODUCT.md + DESIGN.md + cssContent).bytes / 4` for input, 3:1 ratio for output) and writes a single synthetic CostEntry so the ledger shape is identical to the live path.

Detection is mechanical:

1. `resetLedger()` BEFORE `handler.execute()`.
2. Run the flow.
3. `getSessionLedger().filter(e => e.flowId === flowId)` after.
4. If the array is non-empty -> live path. If empty -> synthetic fallback.

This means the runner is forward-compatible: when handlers wire real Anthropic SDK calls and the call site invokes `trackCost`, the corresponding flow rows automatically flip from `"synthetic"` to `"live"` with no code change here. Today every row reports `"synthetic"` because no flow handler calls an LLM yet.

Use the field to filter compare-mode diffs - a cost spike on a `"synthetic"` row reflects fixture changes (input bytes growing), while a spike on a `"live"` row reflects actual API spend.

## Output JSON schema (per run)

```json
{
  "runId": "2026-05-28T17:42:33.514Z",
  "modelTiers": {
    "haiku":  "claude-haiku-4-5-20251001",
    "sonnet": "claude-sonnet-4-6",
    "opus":   "claude-opus-4-7"
  },
  "fixtures": [
    {
      "name": "brand-studio",
      "category": "brand",
      "flows": [
        {
          "flowId": "flowJ_tactical_polish",
          "status": "success",
          "retryStateCount": 1,
          "tierUsed": "opus",
          "modelId": "claude-opus-4-7",
          "polishStandard": {
            "passed": 19,
            "failed": 3,
            "passRate": 0.864,
            "criticalViolations": 0
          },
          "extendedDomain": {
            "passed": 130,
            "failed": 7,
            "passRate": 0.949,
            "byDomain": { "typography": { "passed": 14, "failed": 2, "passRate": 0.875 } }
          },
          "taste": { "violations": [] },
          "latencyMs": 4521,
          "tokensInput": 1200,
          "tokensOutput": 480,
          "estimatedCost": 0.0144,
          "tokenSource": "synthetic"
        }
      ]
    }
  ],
  "totals": {
    "passRateAvg": 0.91,
    "criticalViolations": 0,
    "estimatedCost": 0.156,
    "flowCount": 15
  },
  "harnessVersion": "5a3f8c2b1e9d"
}
```

`harnessVersion` is a sha256(run-all.ts + score.ts + report.ts) prefix - if it changes between baseline and current, the regression report will still run but a divergence is expected.

## Compare logic

For each (fixture, flowId), compute delta of `passRate`, `criticalViolations`, `estimatedCost`. A regression fires (and `npm run bench:compare` exits 1) if any of:

1. `passRate` dropped > **2%** (configurable via `--pass-rate-delta`)
2. `criticalViolations` increased by any amount
3. `estimatedCost` increased > **20%** AND `tierUsed` did not change (a legitimate tier upgrade is allowed)

The console output is a table:

```
fixture          flow                     tier    passRate                crit       cost                          status
---------------  -----------------------  ------  ----------------------  ---------  ----------------------------  ----------------
brand-studio     flowJ_tactical_polish    opus    86.4% -> 81.8%          0 -> 0     $0.0144 -> $0.0145            REGRESSION: passRate dropped 4.5%
brand-studio     flowK_multi_lens_audit   sonnet  100.0% -> 100.0%        0 -> 0     $0.0036 -> $0.0036            OK
...
Result: FAIL (1 regression)
```

## Adding the harness to CI

Suggested GitHub Actions workflow snippet (drop into `.github/workflows/sidecoach-bench.yml`):

```yaml
name: sidecoach-bench
on:
  pull_request:
    paths:
      - 'sidecoach/src/**'
      - 'sidecoach/benchmarks/**'
jobs:
  bench:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 2 }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd sidecoach && npm ci
      - run: cd sidecoach && npm run bench:compare
```

The workflow only fires on PRs touching sidecoach source or the benchmarks themselves. The job fails (exit 1) when any regression trigger fires.

## Limitations (v1)

- **Synthetic token costs.** The flow handlers don't call the Anthropic SDK today; they run rule-based checklists. Until they do, every `tokenSource` is `"synthetic"`. See the [Token source](#token-source) section for how the runner detects and prefers live ledger entries the moment they appear.
- **Three flows only.** v1 runs flow J (tactical polish), K (multi-lens audit), L (design critique). The harness is set up to add more flows by extending `BENCH_FLOWS` in `run-all.ts`.
- **5 fixtures.** Enough variety to prove the harness; expand once you've used it on real regressions.

## Files

```
sidecoach/benchmarks/
  README.md
  tsconfig.bench.json
  fixtures/
    brand-studio/      (brand register, typography emphasis)
    saas-dashboard/    (product register, layout density)
    scroll-landing/    (brand register, motion emphasis)
    form-stress/       (product register, accessibility emphasis)
    mixed-portfolio/   (mixed register)
  runner/
    types.ts           (shared schema types)
    score.ts           (validator aggregation + fixture loading)
    report.ts          (save/load baselines + compare-mode table)
    run-all.ts         (CLI entry point)
  baselines/
    baseline-latest.json   (created by `npm run bench`)
    archive/<timestamp>.json
```
