import { FlowExecutionEngine } from '../sidecoach-orchestrator';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

async function run() {
  const checks: Array<[string, boolean]> = [];
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'sidecoach-parser-'));

  const engine = new FlowExecutionEngine();

  // T1: colon form
  const r1 = await engine.process('/sidecoach composite:composite_qa_workflow', {
    projectPath: sandbox,
    projectContext: { register: 'brand' },
  } as any);
  const r1Message = (r1 as any).message || '';
  console.log('T1 response:', r1Message.substring(0, 100));
  checks.push(['T1: colon form does NOT return the help-text', !r1Message.includes('Please specify composite flow ID')]);

  // T2: space form
  const sandbox2 = fs.mkdtempSync(path.join(os.tmpdir(), 'sidecoach-parser-'));
  const r2 = await engine.process('/sidecoach composite composite_qa_workflow', {
    projectPath: sandbox2,
    projectContext: { register: 'brand' },
  } as any);
  const r2Message = (r2 as any).message || '';
  console.log('T2 response:', r2Message.substring(0, 100));
  checks.push(['T2: space form does NOT return the help-text', !r2Message.includes('Please specify composite flow ID')]);

  // T3: no-target -> help text
  const sandbox3 = fs.mkdtempSync(path.join(os.tmpdir(), 'sidecoach-parser-'));
  const r3 = await engine.process('/sidecoach composite', {
    projectPath: sandbox3,
    projectContext: { register: 'brand' },
  } as any);
  const r3Message = (r3 as any).message || '';
  console.log('T3 response:', r3Message.substring(0, 100));
  checks.push(['T3: no-target form returns help-text', r3Message.includes('Please specify composite flow ID')]);

  // T4: unknown command falls through (does not match composite branch)
  const sandbox4 = fs.mkdtempSync(path.join(os.tmpdir(), 'sidecoach-parser-'));
  const r4 = await engine.process('/sidecoach zzzz_nonexistent_command', {
    projectPath: sandbox4,
    projectContext: { register: 'brand' },
  } as any);
  const r4Message = (r4 as any).message || '';
  console.log('T4 response:', r4Message.substring(0, 100));
  checks.push(['T4: unknown command does NOT return composite help-text', !r4Message.includes('Please specify composite flow ID')]);

  fs.rmSync(sandbox, { recursive: true, force: true });
  fs.rmSync(sandbox2, { recursive: true, force: true });
  fs.rmSync(sandbox3, { recursive: true, force: true });
  fs.rmSync(sandbox4, { recursive: true, force: true });

  let allPass = true;
  for (const [label, ok] of checks) {
    console.log(ok ? `PASS ${label}` : `FAIL ${label}`);
    if (!ok) allPass = false;
  }
  console.log(allPass ? 'sprint7-composite-parser-both-forms PASS' : 'sprint7-composite-parser-both-forms FAIL');
  process.exit(allPass ? 0 : 1);
}

run().catch((e) => { console.error(e); process.exit(1); });
