import { FlowExecutionEngine } from '../sidecoach-orchestrator';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

async function run() {
  const checks: Array<[string, boolean]> = [];

  // Sandbox projectPath for the SUCCESS case.
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'sidecoach-write-step-'));
  const checkpointsDir = path.join(sandbox, '.claude', 'checkpoints');

  // Run a composite. Use composite_qa_workflow (short, 4 flows per flow-composition.ts).
  const engine = new FlowExecutionEngine();
  await engine.process('/sidecoach composite composite_qa_workflow', {
    projectPath: sandbox,
    projectContext: { register: 'brand' },
  } as any);

  // After a fully successful composite, the checkpoint file should be DELETED (cleanup at completion).
  let checkpointFilesAfter: string[] = [];
  if (fs.existsSync(checkpointsDir)) {
    checkpointFilesAfter = fs.readdirSync(checkpointsDir).filter(f => f.endsWith('.json'));
  }
  checks.push(['T1: after full composite success, no checkpoint file remains', checkpointFilesAfter.length === 0]);

  // Sandbox the HALT case.
  const sandbox2 = fs.mkdtempSync(path.join(os.tmpdir(), 'sidecoach-write-step-halt-'));
  const checkpointsDir2 = path.join(sandbox2, '.claude', 'checkpoints');
  const engine2 = new FlowExecutionEngine();

  const { PRESET_COMPOSITE_FLOWS } = require('../flow-composition');
  const qaWorkflow = PRESET_COMPOSITE_FLOWS.find((cf: any) => cf.id === 'composite_qa_workflow');
  const stepToBreak = qaWorkflow.steps[1].flowId;

  // All PRESET composites ship with failOnFirstError=false (and composite_qa_workflow step[1] has
  // skipOnError=true), so a throw would be absorbed and the loop would continue to natural exit -
  // which would then delete the checkpoint. To exercise the "halt leaves a resume seed" contract,
  // override these flags on the imported preset for the duration of this test, then restore.
  const originalFailOnFirstError = qaWorkflow.failOnFirstError;
  const originalSkipOnError = qaWorkflow.steps[1].skipOnError;
  qaWorkflow.failOnFirstError = true;
  qaWorkflow.steps[1].skipOnError = false;

  const handlers = (engine2 as any).handlers as Map<string, any>;
  const originalHandler = handlers.get(stepToBreak);
  handlers.set(stepToBreak, {
    canExecute: () => true,
    execute: async () => { throw new Error('intentional halt for checkpoint test'); },
  });

  await engine2.process('/sidecoach composite composite_qa_workflow', {
    projectPath: sandbox2,
    projectContext: { register: 'brand' },
  } as any);

  if (originalHandler) handlers.set(stepToBreak, originalHandler);

  // Restore the preset flags we mutated so we don't poison sibling tests in the same process.
  qaWorkflow.failOnFirstError = originalFailOnFirstError;
  qaWorkflow.steps[1].skipOnError = originalSkipOnError;

  let checkpointFilesAfterHalt: string[] = [];
  if (fs.existsSync(checkpointsDir2)) {
    checkpointFilesAfterHalt = fs.readdirSync(checkpointsDir2).filter(f => f.endsWith('.json'));
  }
  checks.push(['T2: halted composite leaves a checkpoint on disk', checkpointFilesAfterHalt.length === 1]);

  if (checkpointFilesAfterHalt.length === 1) {
    const cp = JSON.parse(fs.readFileSync(path.join(checkpointsDir2, checkpointFilesAfterHalt[0]), 'utf8'));
    checks.push(['T2: checkpoint cursor reflects steps completed', cp.cursor === 1]);
    checks.push(['T2: checkpoint compositeFlowId matches', cp.compositeFlowId === 'composite_qa_workflow']);
    checks.push(['T2: checkpoint flowResults has exactly 1 result', cp.flowResults.length === 1]);
    checks.push(['T2: checkpoint schemaVersion is 1', cp.schemaVersion === 1]);
  } else {
    checks.push(['T2: checkpoint cursor reflects steps completed', false]);
    checks.push(['T2: checkpoint compositeFlowId matches', false]);
    checks.push(['T2: checkpoint flowResults has exactly 1 result', false]);
    checks.push(['T2: checkpoint schemaVersion is 1', false]);
  }

  fs.rmSync(sandbox, { recursive: true, force: true });
  fs.rmSync(sandbox2, { recursive: true, force: true });

  let allPass = true;
  for (const [label, ok] of checks) {
    console.log(ok ? `PASS ${label}` : `FAIL ${label}`);
    if (!ok) allPass = false;
  }
  console.log(allPass ? 'sprint6-checkpoint-write-on-step PASS' : 'sprint6-checkpoint-write-on-step FAIL');
  process.exit(allPass ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
