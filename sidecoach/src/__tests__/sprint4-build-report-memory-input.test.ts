import { generateBuildReport } from '../build-report-aggregator';
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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sprint4-memory-'));
  const fixturePath = path.join(tmp, 'session_2026-05-24_synthetic_run.md');

  const memoryEntry = {
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
  };

  const fileContent = `---
name: session-2026-05-24-synthetic-run
description: Fixture for sprint4 memory-mode test.
type: project
---

## Flow execution

\`\`\`json
${JSON.stringify(memoryEntry, null, 2)}
\`\`\`
`;
  fs.writeFileSync(fixturePath, fileContent, 'utf8');

  const report = generateBuildReport({
    source: 'memory',
    memoryPaths: [fixturePath],
  });

  assertTrue(report.verdict === 'blocked', `memory-mode: verdict computed (got: ${report.verdict})`);
  assertTrue(report.severityCounts.blocking === 1, 'memory-mode: blocking count correct');
  assertTrue(report.severityCounts.warning === 1, 'memory-mode: warning count correct');

  const colorDomain = report.domainGrades.find((d) => d.domain === 'color');
  const typoDomain = report.domainGrades.find((d) => d.domain === 'typography');
  assertTrue(colorDomain != null, 'memory-mode: color domain extracted');
  assertTrue(typoDomain != null, 'memory-mode: typography domain extracted');
  assertTrue(colorDomain!.letter === 'A', 'memory-mode: color grade A');

  fs.unlinkSync(fixturePath);
  fs.rmdirSync(tmp);

  console.log('sprint4-build-report-memory-input PASS');
})();
