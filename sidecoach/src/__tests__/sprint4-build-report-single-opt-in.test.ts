import { FlowExecutionEngine } from '../sidecoach-orchestrator';
import * as path from 'path';

function assertTrue(cond: any, label: string): void {
  if (!cond) {
    console.error(`FAIL ${label}: got ${JSON.stringify(cond)}`);
    process.exit(1);
  }
}

(async () => {
  const refRoot = path.resolve(__dirname, '../../../reference');
  process.env.SIDECOACH_PROJECT_PATH = refRoot;
  const engine = new FlowExecutionEngine();

  const noFlag = await engine.process('lint design.md', {
    projectPath: refRoot,
    projectContext: { register: 'brand' } as any,
  });
  const r1: any = noFlag;
  assertTrue(r1.buildReport == null, `single flow w/o flag: no buildReport (got: ${typeof r1.buildReport})`);

  const withFlag = await engine.process('lint design.md', {
    projectPath: refRoot,
    projectContext: { register: 'brand' } as any,
    metadata: { emitBuildReport: true },
  });
  const r2: any = withFlag;
  assertTrue(r2.buildReport != null, `single flow with flag: buildReport attached (got: ${typeof r2.buildReport})`);
  assertTrue(typeof r2.buildReport.verdict === 'string', 'buildReport.verdict present');
  assertTrue(Array.isArray(r2.buildReport.flowsExecuted), 'buildReport.flowsExecuted present');
  assertTrue(r2.buildReport.composite == null, 'single-flow buildReport has no composite id');

  console.log('sprint4-build-report-single-opt-in PASS');
})();
