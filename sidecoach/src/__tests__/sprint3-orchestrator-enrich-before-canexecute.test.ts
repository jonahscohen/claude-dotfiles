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

  // Drive a flow that has a register-aware canExecute through the natural-language
  // path of engine.process(). FlowF's canExecute returns true ONLY when
  // projectContext.register is populated. We deliberately do NOT pass register
  // in the caller context - it must come from PRODUCT.md via
  // enrichContextForHandler. If enrichment runs BEFORE canExecute (the T11
  // carryover fix), register will be loaded from reference/PRODUCT.md and
  // flowF's canExecute will return true. Without the fix, canExecute would
  // see undefined register and the orchestrator would skip flowF with the
  // specific canExecute-skip message below.
  //
  // Utterance: 'lint design.md' is unique to flowF among the registered
  // detectors (flowW/flowX were added in Sprint 2 trigger registry but
  // never wired into intent-detector.ts - that's a separate Sprint 3 gap).
  const result = await engine.process('lint design.md', {
    projectPath: refRoot,
    // intentionally no projectContext.register
  });

  const fResult = (result.flowResults || []).find(
    (fr: any) => fr.flowId === 'flowF_design_tokens'
  );
  assertTrue(
    fResult != null,
    `flowF appears in flowResults (got: ${(result.flowResults || []).map((fr: any) => fr.flowId).join(', ')})`
  );

  // The canExecute-skip message comes from the orchestrator's natural-language
  // execution path (sidecoach-orchestrator.ts, the if-not-canExecute block).
  // It looks like: 'Flow cannot execute: prerequisites not met for <flowId>'.
  // If we see THAT specific message, the T11 fix isn't holding.
  // Any other status (success, error, or a different skip message from a
  // downstream validator) is acceptable - it proves canExecute saw enriched
  // context and returned true.
  const canExecuteSkipMessage = `Flow cannot execute: prerequisites not met for flowF_design_tokens`;
  assertTrue(
    fResult!.message !== canExecuteSkipMessage,
    `flowF was NOT canExecute-skipped (got status=${fResult!.status}, message=${JSON.stringify(fResult!.message)}). The T11 fix should make canExecute see enriched register and return true.`
  );

  console.log(`sprint3-orchestrator-enrich-before-canexecute PASS (flowF reached its handler with status=${fResult!.status})`);
})();
