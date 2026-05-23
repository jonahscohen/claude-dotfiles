/**
 * Phase H Block 2 Integration Test - Conditional Flow Execution
 * Tests conditional logic, branching, and guard conditions
 */

import { FlowCompositionEngine, ConditionContext } from '../flow-composition';
import { FlowId } from '../types';

interface TestResult {
  test: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

// Test 1: Condition evaluation
function testConditionEvaluation() {
  const engine = new FlowCompositionEngine();

  const successCondition = engine.evaluateCondition(
    {
      flowId: 'flowA_brand_verify' as FlowId,
      condition: FlowCompositionEngine.requirePreviousStatus('success')
    },
    {
      previousResult: {
        flowId: 'flowA_brand_verify' as FlowId,
        flowName: 'Test',
        status: 'success' as const,
        message: 'Success',
        guidance: [],
        checklist: [],
      },
      executionContext: {} as any,
      executedFlows: new Map(),
    }
  );

  results.push({
    test: 'Condition correctly evaluates previous status',
    passed: successCondition === true,
    message: 'Success condition evaluated correctly',
  });
}

// Test 2: Guard condition prevents execution
function testGuardConditionPrevention() {
  const engine = new FlowCompositionEngine();
  engine.resetExecutionState();

  const context: ConditionContext = {
    previousResult: {
      flowId: 'flowB_component_research' as FlowId,
      flowName: 'Test',
      status: 'error' as const,
      message: 'Failed',
      guidance: [],
      checklist: [],
    },
    executionContext: {} as any,
    executedFlows: new Map(),
  };

  const shouldSkip = engine.shouldSkipStep(
    {
      flowId: 'flowB_component_research' as FlowId,
      condition: FlowCompositionEngine.requirePreviousStatus('success'),
    },
    context
  );

  results.push({
    test: 'Guard condition correctly blocks execution on failure',
    passed: shouldSkip === true,
    message: 'Step correctly skipped due to guard condition',
  });
}

// Test 3: Branching flows based on success
function testBranchingOnSuccess() {
  const engine = new FlowCompositionEngine();

  const step = {
    flowId: 'flowA_brand_verify' as FlowId,
    branches: {
      onSuccess: ['flowF_design_tokens' as FlowId, 'flowG_component_implementation' as FlowId],
      onError: [] as FlowId[],
      onSkipped: [] as FlowId[],
    },
  };

  const successResult = {
    flowId: 'flowA_brand_verify' as FlowId,
    flowName: 'Brand Verify',
    status: 'success' as const,
    message: 'Verified',
    guidance: [],
    checklist: [],
  };

  const branches = engine.getBranchingFlows(step, successResult);

  results.push({
    test: 'Branching selects onSuccess flows when flow succeeds',
    passed: branches.length === 2 && branches[0] === 'flowF_design_tokens',
    message: `${branches.length} branch flows selected`,
  });
}

// Test 4: Branching flows based on error
function testBranchingOnError() {
  const engine = new FlowCompositionEngine();

  const step = {
    flowId: 'flowB_component_research' as FlowId,
    branches: {
      onSuccess: [] as FlowId[],
      onError: ['flowD_reference_inspiration' as FlowId],
      onSkipped: [] as FlowId[],
    },
  };

  const errorResult = {
    flowId: 'flowB_component_research' as FlowId,
    flowName: 'Component Research',
    status: 'error' as const,
    message: 'Failed',
    guidance: [],
    checklist: [],
    error: 'Test error',
  };

  const branches = engine.getBranchingFlows(step, errorResult);

  results.push({
    test: 'Branching selects onError flows when flow fails',
    passed: branches.length === 1 && branches[0] === 'flowD_reference_inspiration',
    message: 'Error branch correctly selected',
  });
}

// Test 5: Executed flows tracking
function testExecutedFlowsTracking() {
  const engine = new FlowCompositionEngine();
  engine.resetExecutionState();

  const result1 = {
    flowId: 'flowA_brand_verify' as FlowId,
    flowName: 'Brand Verify',
    status: 'success' as const,
    message: 'Success',
    guidance: [],
    checklist: [],
  };

  const result2 = {
    flowId: 'flowB_component_research' as FlowId,
    flowName: 'Component Research',
    status: 'success' as const,
    message: 'Success',
    guidance: [],
    checklist: [],
  };

  engine.recordExecutedFlow('flowA_brand_verify' as FlowId, result1);
  engine.recordExecutedFlow('flowB_component_research' as FlowId, result2);

  const executed = engine.getExecutedFlows();

  results.push({
    test: 'Executed flows are tracked for condition context',
    passed: executed.size === 2 && executed.has('flowA_brand_verify' as FlowId),
    message: `${executed.size} flows tracked`,
  });
}

// Test 6: Require flow success condition
function testRequireFlowSuccessCondition() {
  const engine = new FlowCompositionEngine();
  engine.resetExecutionState();

  const result = {
    flowId: 'flowA_brand_verify' as FlowId,
    flowName: 'Brand Verify',
    status: 'success' as const,
    message: 'Success',
    guidance: [],
    checklist: [],
  };

  engine.recordExecutedFlow('flowA_brand_verify' as FlowId, result);

  const context: ConditionContext = {
    executionContext: {} as any,
    executedFlows: engine.getExecutedFlows(),
  };

  const condition = FlowCompositionEngine.requireFlowSuccess('flowA_brand_verify' as FlowId);
  const passes = condition(context);

  results.push({
    test: 'requireFlowSuccess condition correctly identifies successful flows',
    passed: passes === true,
    message: 'Condition correctly detected success',
  });
}

// Test 7: Guidance content condition
function testGuidanceContentCondition() {
  const context: ConditionContext = {
    previousResult: {
      flowId: 'flowC_font_research' as FlowId,
      flowName: 'Test',
      status: 'success' as const,
      message: 'Success',
      guidance: ['Design system is consistent', 'Colors are accessible'],
      checklist: [],
    },
    executionContext: {} as any,
    executedFlows: new Map(),
  };

  const condition = FlowCompositionEngine.requireGuidanceContains('Design system');
  const passes = condition(context);

  results.push({
    test: 'Guidance content condition matches expected patterns',
    passed: passes === true,
    message: 'Guidance pattern correctly detected',
  });
}

// Test 8: Composite conditions (anyOf)
function testCompositeAnyOfCondition() {
  const condition = FlowCompositionEngine.anyOf(
    FlowCompositionEngine.requirePreviousStatus('success'),
    FlowCompositionEngine.requirePreviousStatus('error')
  );

  const contextSuccess: ConditionContext = {
    previousResult: {
      flowId: 'flowD_reference_inspiration' as FlowId,
      flowName: 'Test',
      status: 'success' as const,
      message: 'Success',
      guidance: [],
      checklist: [],
    },
    executionContext: {} as any,
    executedFlows: new Map(),
  };

  const passes = condition(contextSuccess);

  results.push({
    test: 'anyOf composite condition accepts any matching condition',
    passed: passes === true,
    message: 'anyOf condition correctly evaluated',
  });
}

// Test 9: Composite conditions (allOf)
function testCompositeAllOfCondition() {
  const condition = FlowCompositionEngine.allOf(
    FlowCompositionEngine.requirePreviousStatus('success'),
    FlowCompositionEngine.requireGuidanceContains('test')
  );

  const contextMatching: ConditionContext = {
    previousResult: {
      flowId: 'flowE_motion_patterns' as FlowId,
      flowName: 'Test',
      status: 'success' as const,
      message: 'Success',
      guidance: ['test guidance'],
      checklist: [],
    },
    executionContext: {} as any,
    executedFlows: new Map(),
  };

  const passes = condition(contextMatching);

  results.push({
    test: 'allOf composite condition requires all conditions to match',
    passed: passes === true,
    message: 'allOf condition correctly evaluated',
  });
}

// Test 10: No branching when no branches defined
function testNoBranchingByDefault() {
  const engine = new FlowCompositionEngine();

  const step = {
    flowId: 'flowC_font_research' as FlowId,
  };

  const result = {
    flowId: 'flowC_font_research' as FlowId,
    flowName: 'Font Research',
    status: 'success' as const,
    message: 'Success',
    guidance: [],
    checklist: [],
  };

  const branches = engine.getBranchingFlows(step, result);

  results.push({
    test: 'Steps without branches return empty array',
    passed: branches.length === 0,
    message: 'No branching occurred as expected',
  });
}

// Run all tests
function runTests() {
  testConditionEvaluation();
  testGuardConditionPrevention();
  testBranchingOnSuccess();
  testBranchingOnError();
  testExecutedFlowsTracking();
  testRequireFlowSuccessCondition();
  testGuidanceContentCondition();
  testCompositeAnyOfCondition();
  testCompositeAllOfCondition();
  testNoBranchingByDefault();

  console.log('Phase H Block 2: Conditional Flow Execution Test');
  console.log('='.repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  for (const result of results) {
    const statusSymbol = result.passed ? '✓' : '✗';
    console.log(`${statusSymbol} ${result.test}`);
    if (result.message) {
      console.log(`  ${result.message}`);
    }
  }

  console.log('='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
