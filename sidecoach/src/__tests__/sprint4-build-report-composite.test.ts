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

  const result = await engine.process('/sidecoach composite composite_craft_landing_page', {
    projectPath: refRoot,
    projectContext: { register: 'brand' } as any,
  });

  assertTrue((result.flowResults || []).length > 0, 'composite produced flowResults');

  const r: any = result;
  assertTrue(r.buildReport != null, `result.buildReport present (got: ${typeof r.buildReport})`);

  const br = r.buildReport;
  assertTrue(typeof br.verdict === 'string', 'buildReport.verdict is a string');
  assertTrue(Array.isArray(br.flowsExecuted) && br.flowsExecuted.length > 0, 'buildReport.flowsExecuted populated');
  assertTrue(br.composite === 'composite_craft_landing_page', 'buildReport.composite matches preset id');
  assertTrue(typeof br.severityCounts === 'object', 'buildReport.severityCounts present');
  assertTrue(typeof br.overallGrade === 'string', 'buildReport.overallGrade is a string');

  const artifacts = r.artifacts || [];
  const buildReportArtifact = artifacts.find((a: any) => a.type === 'reference' && a.name === 'Build Report');
  assertTrue(buildReportArtifact != null, `Build Report artifact present (artifacts: ${artifacts.map((a: any) => a.name).join(', ')})`);
  assertTrue(typeof buildReportArtifact.content === 'string' && buildReportArtifact.content.length > 0, 'Build Report artifact has non-empty content');
  assertTrue(/Verdict:/i.test(buildReportArtifact.content), 'Build Report content contains a Verdict section');

  console.log('sprint4-build-report-composite PASS');
})();
