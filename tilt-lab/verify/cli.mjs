#!/usr/bin/env node
// tilt-verify - a diff-aware, browser-driven functional verification harness for
// the tilt-lab playground. It drives a real Chromium via Playwright against the
// running dev server and reports pass/fail per functional check, per effect.
//
// Functional truth only. Visual/aesthetic truth stays with human-reviewed
// screenshots; this tool never claims an effect "looks right", only that it
// paints, its controls respond, it logs no errors, and its frames are sane.
import { chromium } from 'playwright';
import { loadCatalog } from './lib/catalog.mjs';
import { changedScope } from './lib/git-diff.mjs';
import { verifyEffect, NavigationLost } from './lib/checks.mjs';

const DEFAULT_URL = 'http://localhost:5180';

function parseArgs(argv) {
  const args = { url: DEFAULT_URL, all: false, headed: false, json: false, effects: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') args.all = true;
    else if (a === '--headed') args.headed = true;
    else if (a === '--json') args.json = true;
    else if (a === '--url') args.url = argv[++i];
    else if (a === '--effect') args.effects.push(argv[++i]);
    else if (a === '--help' || a === '-h') args.help = true;
    else if (!a.startsWith('-')) args.effects.push(a); // bare id
  }
  return args;
}

const HELP = `tilt-verify - functional browser verification for tilt-lab effects

Usage:
  npm run verify                 verify only effects changed in the working tree
  npm run verify -- --all        verify every effect in the catalog
  npm run verify -- <id> [id...] verify specific effect ids (e.g. gradient swirl)
  npm run verify -- --effect id same as bare id, repeatable

Options:
  --url <url>     dev server URL (default ${DEFAULT_URL})
  --all          test the full catalog regardless of git diff
  --headed       run with a visible browser window (debugging)
  --json         emit machine-readable JSON instead of the text report
  -h, --help     this help

Checks per effect (functional truth only):
  add-layer          clicking the effect's card adds a layer to the stack
  canvas-paint       the preview surface is non-blank (real pixels decoded)
  param-interaction  the first param control responds to real user input
  perf-frames        frame timing is sane (no sustained long frames)
  console-clean      no console.error / uncaught page errors during the run

Exit code is non-zero if any check fails.`;

function pickTargets(catalog, args) {
  if (args.effects.length) {
    const byId = new Map(catalog.map((m) => [m.id, m]));
    const found = [];
    const missing = [];
    for (const id of args.effects) (byId.has(id) ? found : missing).push(byId.get(id) ?? id);
    return { targets: found, reason: `explicit: ${args.effects.join(', ')}`, missing };
  }
  if (args.all) return { targets: catalog, reason: 'full catalog (--all)', missing: [] };

  const scope = changedScope();
  if (scope.appChanged) {
    return { targets: catalog, reason: 'app/runtime shell changed -> full catalog', missing: [] };
  }
  if (scope.effects.size) {
    const targets = catalog.filter((m) => scope.effects.has(m.id));
    return { targets, reason: `git diff: ${[...scope.effects].join(', ')}`, missing: [] };
  }
  return { targets: catalog, reason: 'no effect changes detected -> full catalog', missing: [] };
}

const ICON = { pass: 'PASS', fail: 'FAIL', skip: 'skip' };

function printReport(results, meta) {
  console.log(`\ntilt-verify - functional verification`);
  console.log(`  url:    ${meta.url}`);
  console.log(`  scope:  ${meta.reason}`);
  console.log(`  effects: ${results.length}\n`);
  let failed = 0;
  for (const r of results) {
    const bad = r.checks.some((c) => c.status === 'fail');
    if (bad) failed++;
    console.log(`${bad ? 'x' : 'o'} ${r.name} (${r.effect})`);
    for (const c of r.checks) {
      console.log(`    [${ICON[c.status]}] ${c.name.padEnd(18)} ${c.detail}`);
    }
  }
  const counts = results.flatMap((r) => r.checks).reduce(
    (acc, c) => ((acc[c.status] = (acc[c.status] ?? 0) + 1), acc),
    {},
  );
  console.log(
    `\nsummary: ${results.length} effects, ${failed} with failures | ` +
      `checks pass=${counts.pass ?? 0} fail=${counts.fail ?? 0} skip=${counts.skip ?? 0}`,
  );
  return failed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return 0;
  }

  const catalog = loadCatalog();
  const { targets, reason, missing } = pickTargets(catalog, args);
  if (missing.length) console.error(`warning: unknown effect id(s): ${missing.join(', ')}`);
  if (targets.length === 0) {
    console.error('no effects to verify.');
    return 1;
  }

  // Fail fast if the dev server is not reachable - clearer than a Playwright timeout.
  try {
    const res = await fetch(args.url, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error(`dev server not reachable at ${args.url} (${e.message}).`);
    console.error(`start it with:  npm run dev`);
    return 1;
  }

  const browser = await chromium.launch({ headless: !args.headed });
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });

  // Preflight: confirm the playground actually mounts before testing effects.
  // A broken bundle (e.g. a TS error in any effect) makes Vite 500 a module and
  // React never renders - fail loud and clear instead of 23 selector timeouts.
  {
    const preErrors = [];
    page.on('pageerror', (e) => preErrors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && preErrors.push(m.text()));
    await page.goto(args.url, { waitUntil: 'domcontentloaded' });
    const mounted = await page
      .waitForSelector('.preview-canvas', { timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    page.removeAllListeners('pageerror');
    page.removeAllListeners('console');
    if (!mounted) {
      const rootEmpty = await page.evaluate(() => !document.getElementById('root')?.innerHTML).catch(() => true);
      console.error(`\nplayground did not mount at ${args.url}`);
      console.error(rootEmpty ? '  #root is empty - the dev bundle is likely broken.' : '  preview surface never appeared.');
      if (preErrors.length) console.error('  errors:\n    ' + preErrors.slice(0, 6).join('\n    '));
      console.error('  fix the build (npm run typecheck / check the dev-server output) and re-run.');
      await browser.close();
      return 1;
    }
  }

  const results = [];
  try {
    for (const mft of targets) {
      process.stderr.write(`  verifying ${mft.id} ...\n`);
      // HMR from a live dev server can reload the page mid-run; retry those once.
      let result = null;
      for (let attempt = 0; attempt < 2 && !result; attempt++) {
        try {
          result = await verifyEffect(page, mft, { url: args.url });
        } catch (e) {
          if (e instanceof NavigationLost && attempt === 0) {
            process.stderr.write(`    (page reloaded mid-run, retrying ${mft.id})\n`);
            continue;
          }
          result = {
            effect: mft.id,
            name: mft.name,
            checks: [{ name: 'harness', status: 'fail', detail: `threw: ${e.message}` }],
            errors: [e.message],
          };
        }
      }
      results.push(result);
    }
  } finally {
    await browser.close();
  }

  if (args.json) {
    console.log(JSON.stringify({ url: args.url, reason, results }, null, 2));
    return results.some((r) => r.checks.some((c) => c.status === 'fail')) ? 1 : 0;
  }

  const failed = printReport(results, { url: args.url, reason });
  return failed > 0 ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(2);
  },
);
