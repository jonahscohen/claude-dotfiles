import { FlowExecutionEngine } from '../sidecoach-orchestrator';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

async function run() {
  const checks: Array<[string, boolean]> = [];
  const { PRESET_COMPOSITE_FLOWS } = require('../flow-composition');

  // ============================================================
  // POSITIVE CASE: round 1 halts, round 2 resumes and completes.
  // ============================================================
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'sidecoach-resume-'));
  const checkpointsDir = path.join(sandbox, '.claude', 'checkpoints');
  const engine = new FlowExecutionEngine();

  const qa = PRESET_COMPOSITE_FLOWS.find((cf: any) => cf.id === 'composite_qa_workflow');
  // Save original flags (will restore after round 2).
  const originalFailOnFirst = qa.failOnFirstError;
  const originalSkipOnError = qa.steps[1].skipOnError;
  qa.failOnFirstError = true;
  qa.steps[1].skipOnError = false;

  const stepToBreak = qa.steps[1].flowId;
  const handlers = (engine as any).handlers as Map<string, any>;
  const originalHandler = handlers.get(stepToBreak);

  // ROUND 1: break step 1 so the composite halts after step 0 writes a checkpoint.
  handlers.set(stepToBreak, {
    canExecute: () => true,
    execute: async () => { throw new Error('intentional halt for resume test'); },
  });
  const round1 = await engine.process('/sidecoach composite composite_qa_workflow', {
    projectPath: sandbox,
    projectContext: { register: 'brand' },
  } as any);

  checks.push(['round1: success is false (halted)', round1.success === false]);
  const files1 = fs.readdirSync(checkpointsDir).filter(f => f.endsWith('.json'));
  checks.push(['round1: exactly one checkpoint file on disk', files1.length === 1]);
  const checkpointId = files1[0].replace(/\.json$/, '');
  const cpData = JSON.parse(fs.readFileSync(path.join(checkpointsDir, files1[0]), 'utf8'));
  checks.push(['round1: checkpoint cursor === 1', cpData.cursor === 1]);

  // RESTORE the broken handler so round 2 can run cleanly.
  if (originalHandler) handlers.set(stepToBreak, originalHandler);

  // ROUND 2: resume with metadata.resumeFromCheckpoint. Flags STAY overridden (failOnFirstError=true)
  // so we get a clean run-to-completion now that the bad step is healed.
  const round2 = await engine.process('any utterance, ignored', {
    projectPath: sandbox,
    projectContext: { register: 'brand' },
    metadata: { resumeFromCheckpoint: checkpointId },
  } as any);

  // Restore composite flags now that round 2 finished.
  qa.failOnFirstError = originalFailOnFirst;
  qa.steps[1].skipOnError = originalSkipOnError;

  checks.push(['round2: success is true', round2.success === true]);
  checks.push(['round2: flowResults includes the step-0 result from the checkpoint', Array.isArray(round2.flowResults) && round2.flowResults.length >= qa.steps.length]);
  // After full success, the original checkpoint plus any newly-written checkpoint should both be cleaned up.
  const files2 = fs.existsSync(checkpointsDir) ? fs.readdirSync(checkpointsDir).filter(f => f.endsWith('.json')) : [];
  checks.push(['round2: no checkpoint files remain after full success', files2.length === 0]);

  fs.rmSync(sandbox, { recursive: true, force: true });

  // ============================================================
  // NEGATIVE CASE 1: nonexistent resume id.
  // ============================================================
  const sandbox2 = fs.mkdtempSync(path.join(os.tmpdir(), 'sidecoach-resume-neg-'));
  const engine2 = new FlowExecutionEngine();
  const negResult = await engine2.process('whatever', {
    projectPath: sandbox2,
    projectContext: { register: 'brand' },
    metadata: { resumeFromCheckpoint: 'sidecoach-does-not-exist-xyz' },
  } as any);

  checks.push(['neg1: success is false for missing checkpoint id', negResult.success === false]);
  checks.push(['neg1: message identifies the failure', typeof negResult.message === 'string' && /(cannot resume|not found|missing)/i.test(negResult.message)]);
  fs.rmSync(sandbox2, { recursive: true, force: true });

  // ============================================================
  // NEGATIVE CASE 2: forged schemaVersion=2 checkpoint.
  // ============================================================
  const sandbox3 = fs.mkdtempSync(path.join(os.tmpdir(), 'sidecoach-resume-v2-'));
  const checkpointsDir3 = path.join(sandbox3, '.claude', 'checkpoints');
  fs.mkdirSync(checkpointsDir3, { recursive: true });
  const forgedId = 'sidecoach-forged-v2';
  const forged = {
    schemaVersion: 2,
    checkpointId: forgedId,
    compositeFlowId: 'composite_qa_workflow',
    createdAt: new Date().toISOString(),
    cursor: 0,
    completedStepIds: [],
    flowResults: [],
    executionContext: { utterance: '', projectPath: sandbox3, metadata: {} },
    utterance: '',
  };
  fs.writeFileSync(path.join(checkpointsDir3, `${forgedId}.json`), JSON.stringify(forged));

  const engine3 = new FlowExecutionEngine();
  const v2Result = await engine3.process('whatever', {
    projectPath: sandbox3,
    projectContext: { register: 'brand' },
    metadata: { resumeFromCheckpoint: forgedId },
  } as any);

  checks.push(['neg2: success is false for schemaVersion mismatch', v2Result.success === false]);
  checks.push(['neg2: message mentions schemaVersion', typeof v2Result.message === 'string' && /schemaversion/i.test(v2Result.message)]);
  fs.rmSync(sandbox3, { recursive: true, force: true });

  let allPass = true;
  for (const [label, ok] of checks) {
    console.log(ok ? `PASS ${label}` : `FAIL ${label}`);
    if (!ok) allPass = false;
  }
  console.log(allPass ? 'sprint6-checkpoint-resume PASS' : 'sprint6-checkpoint-resume FAIL');
  process.exit(allPass ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
