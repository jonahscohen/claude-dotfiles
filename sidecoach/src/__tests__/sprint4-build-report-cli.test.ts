import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

function assertTrue(cond: any, label: string): void {
  if (!cond) {
    console.error(`FAIL ${label}: got ${JSON.stringify(cond)}`);
    process.exit(1);
  }
}

(() => {
  const repoRoot = path.resolve(__dirname, '../../..');
  const cliPath = path.join(repoRoot, 'sidecoach', 'bin', 'sidecoach-build-report.js');

  // Build first so dist/* is up to date
  const buildResult = spawnSync('npm', ['run', 'build'], { cwd: path.join(repoRoot, 'sidecoach'), encoding: 'utf8' });
  if (buildResult.status !== 0) {
    console.error('build failed:', buildResult.stderr);
    process.exit(1);
  }

  const fixturePayload = JSON.stringify({
    source: 'flow-results',
    flowResults: [
      {
        flowId: 'flowF_design_tokens',
        flowName: 'Design System Tokens',
        status: 'success',
        message: 'ok',
        memory: {
          flowId: 'flowF_design_tokens',
          flowName: 'Design System Tokens',
          timestamp: new Date().toISOString(),
          status: 'success',
          rulesAppliedByDomain: {},
          decisions: [],
          userDecisions: [],
          metrics: [
            { name: 'color.contrast-pass-rate', value: 100, status: 'pass' },
            { name: 'typography.scale-pass-rate', value: 80, status: 'warning' },
          ],
          validationResults: [{ check: 'DESIGN.md_lint', result: 'fail', details: 'lint failed' }],
          referencesUsed: [],
          gates: [],
          artifactProduced: [],
          summary: 'tokens validated',
        },
      },
    ],
    composite: 'composite_craft_landing_page',
  });

  // --json flag emits the BuildReport struct
  const jsonRun = spawnSync('node', [cliPath, '--from-stdin', '--json'], { input: fixturePayload, encoding: 'utf8' });
  assertTrue(jsonRun.status === 0, `CLI --json exit 0 (got: ${jsonRun.status}, stderr: ${jsonRun.stderr})`);
  const report = JSON.parse(jsonRun.stdout);
  assertTrue(report.verdict === 'blocked', 'CLI --json: verdict computed correctly');
  assertTrue(report.composite === 'composite_craft_landing_page', 'CLI --json: composite preserved');
  assertTrue(report.severityCounts.blocking === 1, 'CLI --json: severity count correct');
  assertTrue(Array.isArray(report.domainGrades) && report.domainGrades.length === 2, 'CLI --json: domain grades populated');

  // Default (no --json) emits markdown
  const mdRun = spawnSync('node', [cliPath, '--from-stdin'], { input: fixturePayload, encoding: 'utf8' });
  assertTrue(mdRun.status === 0, `CLI default exit 0 (got: ${mdRun.status})`);
  assertTrue(/# Build Report/.test(mdRun.stdout), 'CLI default: markdown header');
  assertTrue(/Verdict: BLOCKED/.test(mdRun.stdout), 'CLI default: verdict in markdown');

  // --output-file writes to disk
  const tmpFile = path.join(os.tmpdir(), `sprint4-cli-${Date.now()}.md`);
  const fileRun = spawnSync('node', [cliPath, '--from-stdin', '--output-file', tmpFile], { input: fixturePayload, encoding: 'utf8' });
  assertTrue(fileRun.status === 0, `CLI --output-file exit 0 (got: ${fileRun.status})`);
  assertTrue(fs.existsSync(tmpFile), `CLI --output-file: file exists at ${tmpFile}`);
  const fileContent = fs.readFileSync(tmpFile, 'utf8');
  assertTrue(/# Build Report/.test(fileContent), 'CLI --output-file: contains markdown header');
  fs.unlinkSync(tmpFile);

  console.log('sprint4-build-report-cli PASS');
})();
