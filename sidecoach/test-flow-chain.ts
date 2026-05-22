import { createExecutionEngine } from './src/sidecoach-orchestrator';
import { FlowExecutionContext } from './src/flow-handler';

/**
 * Test script: Verify flow chaining works end-to-end
 *
 * Tests invisible orchestration:
 * 1. User utterance triggers intent detection
 * 2. Initial flow executes
 * 3. Orchestrator recommends next flow
 * 4. Chain continues until complete
 */

async function testFlowChaining() {
  const engine = createExecutionEngine();

  // Test 1: Brand verification (first step in any design work)
  console.log('\n=== TEST 1: Brand verification ===\n');
  const result1 = await engine.process('Verify our product brand before starting', {
    projectPath: '/example/project',
  });

  console.log(`Initial flow: ${result1.detectedFlow?.flowName}`);
  console.log(`Success: ${result1.success}`);
  console.log(`Flows executed: ${result1.flowResults.length}`);
  console.log(
    `Flow sequence: ${result1.flowResults
      .map((r) => r.flowName)
      .join(' → ')}`
  );
  console.log(`\nFlow statuses:`);
  result1.flowResults.forEach((r) => {
    console.log(`  [${r.flowName}] ${r.status}`);
  });

  // Test 2: Research phase (component + font research)
  console.log('\n=== TEST 2: Research components ===\n');
  const result2 = await engine.process('Research component patterns for our design system', {
    projectPath: '/example/project',
  });
  console.log(`Initial flow: ${result2.detectedFlow?.flowName}`);
  console.log(`Flows executed: ${result2.flowResults.length}`);
  console.log(
    `Flow sequence: ${result2.flowResults
      .map((r) => r.flowName)
      .join(' → ')}`
  );

  // Test 3: Design tokens (execution phase)
  console.log('\n=== TEST 3: Design tokens ===\n');
  const result3 = await engine.process('Create design tokens for the system', {
    projectPath: '/example/project',
  });
  console.log(`Initial flow: ${result3.detectedFlow?.flowName}`);
  console.log(`Flows executed: ${result3.flowResults.length}`);
  console.log(
    `Flow sequence: ${result3.flowResults
      .map((r) => r.flowName)
      .join(' → ')}`
  );

  // Test 4: Accessibility review (polish phase)
  console.log('\n=== TEST 4: Accessibility review ===\n');
  const result4 = await engine.process('Make sure this is accessible to all users', {
    projectPath: '/example/project',
  });
  console.log(`Initial flow: ${result4.detectedFlow?.flowName}`);
  console.log(`Flows executed: ${result4.flowResults.length}`);
  console.log(
    `Flow sequence: ${result4.flowResults
      .map((r) => r.flowName)
      .join(' → ')}`
  );

  console.log('\n✓ Flow chaining test complete');
}

testFlowChaining().catch(console.error);
