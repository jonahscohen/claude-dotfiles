import { createExecutionEngine } from '../sidecoach-orchestrator';

console.log('\n[Task 10] Flow N Live Browser Iteration with Justify\n');
console.log('='.repeat(80));

const orchestrator = createExecutionEngine();

// Test 1: Without Justify available
console.log('\n[Test 1] Flow N without Justify (token-based fallback)');
delete process.env.JUSTIFY_AVAILABLE;

orchestrator.process('/sidecoach rapid button states').then((result: any) => {
  const hasFlowN = result.flowResults && result.flowResults.some((r: any) => r.flowId === 'flowN_rapid_iteration_refined');
  const noJustifyMsg = result.flowResults && result.flowResults.some((r: any) =>
    r.guidance && r.guidance.some((g: string) => g.includes('DESIGN.md tokens'))
  );

  console.log(`  Flow N executed: ${hasFlowN ? 'YES' : 'NO'}`);
  console.log(`  Token-based fallback guidance: ${noJustifyMsg ? 'YES' : 'NO'}`);
  console.log(`  Result: ${hasFlowN && noJustifyMsg ? 'PASS' : 'FAIL'}`);

  // Test 2: With Justify available
  console.log('\n[Test 2] Flow N with Justify (live browser iteration)');
  process.env.JUSTIFY_AVAILABLE = 'true';

  return orchestrator.process('/sidecoach rapid navigation');
}).then((result: any) => {
  const hasFlowN = result.flowResults && result.flowResults.some((r: any) => r.flowId === 'flowN_rapid_iteration_refined');
  const justifyMsg = result.flowResults && result.flowResults.some((r: any) =>
    r.message && r.message.includes('Justify')
  );
  const justifyGuidance = result.flowResults && result.flowResults.some((r: any) =>
    r.guidance && r.guidance.some((g: string) => g.includes('LIVE BROWSER ITERATION ENABLED'))
  );
  const justifyArtifact = result.flowResults && result.flowResults.some((r: any) =>
    r.artifacts && r.artifacts.some((a: any) => a.name === 'justify-iteration-session')
  );

  console.log(`  Flow N executed: ${hasFlowN ? 'YES' : 'NO'}`);
  console.log(`  Message mentions Justify: ${justifyMsg ? 'YES' : 'NO'}`);
  console.log(`  Guidance shows live iteration: ${justifyGuidance ? 'YES' : 'NO'}`);
  console.log(`  Justify artifact created: ${justifyArtifact ? 'YES' : 'NO'}`);

  const allConditions = hasFlowN && justifyMsg && justifyGuidance && justifyArtifact;
  console.log(`\n  Result: ${allConditions ? 'PASS' : 'FAIL'}`);

  // Test 3: Artifact structure
  console.log('\n[Test 3] Justify artifact structure');
  const flowN = result.flowResults && result.flowResults.find((r: any) => r.flowId === 'flowN_rapid_iteration_refined');
  const artifact = flowN && flowN.artifacts && flowN.artifacts.find((a: any) => a.name === 'justify-iteration-session');

  if (artifact) {
    const content = JSON.parse(artifact.content);
    const hasMode = content.mode === 'live-browser-iteration';
    const hasStatus = content.improveStatus === 'connected';
    const hasMaxRounds = content.maxRounds === 10;
    const hasCaptureMode = content.captureMode === 'screenshot-per-round';

    console.log(`  Mode set to live-browser-iteration: ${hasMode ? 'YES' : 'NO'}`);
    console.log(`  Justify status set to connected: ${hasStatus ? 'YES' : 'NO'}`);
    console.log(`  Max rounds set to 10: ${hasMaxRounds ? 'YES' : 'NO'}`);
    console.log(`  Capture mode is screenshot-per-round: ${hasCaptureMode ? 'YES' : 'NO'}`);

    const structureValid = hasMode && hasStatus && hasMaxRounds && hasCaptureMode;
    console.log(`\n  Result: ${structureValid ? 'PASS' : 'FAIL'}`);
  } else {
    console.log('\n  Result: FAIL (artifact not found)');
  }

  console.log('\n' + '='.repeat(80));
}).catch((error: any) => {
  console.error('Test failed:', error);
  process.exit(1);
});
