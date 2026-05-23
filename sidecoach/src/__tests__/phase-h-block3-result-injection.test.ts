/**
 * Phase H Block 3 Integration Test - Flow Result Injection and Propagation
 * Tests automatic result injection, context transformation, and metadata accumulation
 */

import { FlowCompositionEngine, ResultInjectionConfig } from '../flow-composition';
import { FlowId } from '../types';
import { FlowExecutionContext } from '../flow-handler';

interface TestResult {
  test: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

// Helper to create test context
function createTestContext(): FlowExecutionContext {
  return {
    utterance: 'test',
    projectPath: '/project',
    userId: 'test-user',
    metadata: {},
  };
}

// Helper to create test result
function createTestResult(
  flowId: FlowId,
  status: 'success' | 'error' | 'skipped' = 'success',
  guidance: string[] = [],
  checklist: any[] = []
) {
  return {
    flowId,
    flowName: flowId,
    status,
    message: `${flowId} ${status}`,
    guidance,
    checklist,
    artifacts: status === 'success' ? [{ id: `${flowId}_artifact`, name: 'artifact', content: 'content', type: 'reference' as const }] : [],
  };
}

// Test 1: Basic result injection
function testBasicResultInjection() {
  const context = createTestContext();
  const result = createTestResult('flowA_brand_verify' as FlowId, 'success', ['Design verified'], []);
  const config: ResultInjectionConfig = {
    injectFlowId: true,
    injectFlowName: true,
    injectGuidance: true,
  };

  const injected = FlowCompositionEngine.injectResultIntoContext(context, result, config);

  const hasPreviousFlowId = injected.metadata?.previousFlowResult_flowId === 'flowA_brand_verify';
  const hasPreviousFlowName = injected.metadata?.previousFlowResult_flowName === 'flowA_brand_verify';
  const hasGuidance = Array.isArray(injected.metadata?.previousFlowResult_guidance);

  results.push({
    test: 'Basic result injection adds flowId, flowName, and guidance to metadata',
    passed: hasPreviousFlowId && hasPreviousFlowName && hasGuidance,
    message: 'Result successfully injected into context',
  });
}

// Test 2: Custom injection key
function testCustomInjectionKey() {
  const context = createTestContext();
  const result = createTestResult('flowB_component_research' as FlowId);
  const config: ResultInjectionConfig = {
    injectFlowId: true,
    customKey: 'componentResearch',
  };

  const injected = FlowCompositionEngine.injectResultIntoContext(context, result, config);

  const hasCustomKey = injected.metadata?.componentResearch_flowId === 'flowB_component_research';

  results.push({
    test: 'Custom injection key correctly nests result under custom key',
    passed: hasCustomKey,
    message: 'Custom key "componentResearch" applied',
  });
}

// Test 3: Metrics injection
function testMetricsInjection() {
  const context = createTestContext();
  const result = createTestResult('flowC_font_research' as FlowId, 'success');
  const config: ResultInjectionConfig = {
    injectMetrics: true,
  };

  const injected = FlowCompositionEngine.injectResultIntoContext(context, result, config);

  const hasStatus = injected.metadata?.previousFlowResult_status === 'success';

  results.push({
    test: 'Metrics injection adds status to metadata',
    passed: hasStatus,
    message: 'Flow status correctly injected',
  });
}

// Test 4: Intelligent context transformation
function testIntelligentContextTransform() {
  const context = createTestContext();
  const result = createTestResult(
    'flowD_reference_inspiration' as FlowId,
    'success',
    ['Reference found', 'Pattern detected'],
    [{ task: 'Review references' }]
  );

  const transformed = FlowCompositionEngine.intelligentContextTransform(context, result);

  const hasPreviousFlowId = transformed.metadata?.previousFlowId === 'flowD_reference_inspiration';
  const hasGuidanceArray = Array.isArray(transformed.metadata?.previousFlowGuidance);
  const hasGuidanceCount = transformed.metadata?.previousFlowGuidanceCount === 2;
  const hasChecklistCount = transformed.metadata?.previousFlowChecklistCount === 1;

  results.push({
    test: 'Intelligent transformation injects all result data with counts',
    passed:
      hasPreviousFlowId && hasGuidanceArray && hasGuidanceCount && hasChecklistCount,
    message: 'All result properties intelligently injected',
  });
}

// Test 5: Conditional transformer
function testConditionalTransformer() {
  const shouldTransform = (result: any) => result.status === 'success';
  const transform = (context: FlowExecutionContext, result: any) => {
    const transformed = { ...context };
    transformed.metadata = {
      ...transformed.metadata,
      successfulFlowId: result.flowId,
    };
    return transformed;
  };

  const transformer = FlowCompositionEngine.createConditionalTransformer(
    shouldTransform,
    transform
  );

  const context = createTestContext();
  const successResult = createTestResult('flowE_motion_patterns' as FlowId, 'success');
  const errorResult = createTestResult('flowF_design_tokens' as FlowId, 'error');

  const transformedSuccess = transformer(context, successResult);
  const transformedError = transformer(context, errorResult);

  const successTransformed = transformedSuccess.metadata?.successfulFlowId === 'flowE_motion_patterns';
  const errorNotTransformed = !transformedError.metadata?.successfulFlowId;

  results.push({
    test: 'Conditional transformer only applies when condition is met',
    passed: successTransformed && errorNotTransformed,
    message: 'Transformer correctly conditional on status',
  });
}

// Test 6: Result accumulation
function testResultAccumulation() {
  const context = createTestContext();
  const results1 = [
    createTestResult('flowA_brand_verify' as FlowId, 'success'),
    createTestResult('flowB_component_research' as FlowId, 'success'),
  ];
  const results2 = [
    createTestResult('flowC_font_research' as FlowId, 'error'),
  ];

  let accumulated = FlowCompositionEngine.accumulateResultsInContext(context, results1);
  accumulated = FlowCompositionEngine.accumulateResultsInContext(accumulated, results2);

  const hasAccumulatedResults = Array.isArray(accumulated.metadata?.accumulatedResults);
  const resultCount = accumulated.metadata?.accumulatedResults?.length === 3;
  const successCount = accumulated.metadata?.successfulFlowCount === 2;
  const failCount = accumulated.metadata?.failedFlowCount === 1;

  results.push({
    test: 'Result accumulation tracks all flows and counts statuses',
    passed: hasAccumulatedResults && resultCount && successCount && failCount,
    message: '3 results accumulated with 2 success, 1 failed',
  });
}

// Test 7: Artifact injection
function testArtifactInjection() {
  const context = createTestContext();
  const result = createTestResult('flowG_component_implementation' as FlowId, 'success');
  (result as any).artifacts = [
    { id: 'artifact1', name: 'ref1', content: 'content1', type: 'reference' },
    { id: 'artifact2', name: 'comp1', content: 'content2', type: 'reference' },
  ];
  const config: ResultInjectionConfig = {
    injectArtifacts: true,
  };

  const injected = FlowCompositionEngine.injectResultIntoContext(context, result, config);

  const hasArtifacts = Array.isArray(injected.metadata?.previousFlowResult_artifacts);
  const artifactCount = injected.metadata?.previousFlowResult_artifacts?.length === 2;

  results.push({
    test: 'Artifact injection preserves artifact array',
    passed: hasArtifacts && artifactCount,
    message: '2 artifacts successfully injected',
  });
}

// Test 8: Checklist injection
function testChecklistInjection() {
  const context = createTestContext();
  const result = createTestResult('flowH_motion_integration' as FlowId, 'success');
  result.checklist = [
    { task: 'Verify animation timing', completed: true },
    { task: 'Check reduced motion', completed: false },
  ];
  const config: ResultInjectionConfig = {
    injectChecklist: true,
  };

  const injected = FlowCompositionEngine.injectResultIntoContext(context, result, config);

  const hasChecklist = Array.isArray(injected.metadata?.previousFlowResult_checklist);
  const checklistCount = injected.metadata?.previousFlowResult_checklist?.length === 2;

  results.push({
    test: 'Checklist injection preserves checklist array',
    passed: hasChecklist && checklistCount,
    message: '2 checklist items successfully injected',
  });
}

// Test 9: No injection when config is empty
function testNoInjectionWhenEmpty() {
  const context = createTestContext();
  const result = createTestResult('flowI_accessibility' as FlowId);
  const config: ResultInjectionConfig = {};

  const injected = FlowCompositionEngine.injectResultIntoContext(context, result, config);

  const noNewKeys = Object.keys(injected.metadata || {}).length === 0;

  results.push({
    test: 'Empty injection config results in no metadata changes',
    passed: noNewKeys,
    message: 'Metadata unchanged when config is empty',
  });
}

// Test 10: Multiple transformation chain
function testMultipleTransformations() {
  let context = createTestContext();

  const result1 = createTestResult('flowJ_tactical_polish' as FlowId, 'success', ['Polish applied']);
  context = FlowCompositionEngine.intelligentContextTransform(context, result1);

  const result2 = createTestResult('flowK_multi_lens_audit' as FlowId, 'success', ['Issues found']);
  context = FlowCompositionEngine.intelligentContextTransform(context, result2);

  // After two transformations, we should have the second flow's data
  const hasLatestFlowId = context.metadata?.previousFlowId === 'flowK_multi_lens_audit';
  const hasLatestGuidance = context.metadata?.previousFlowGuidance?.includes('Issues found');

  results.push({
    test: 'Multiple transformations update context with latest flow data',
    passed: hasLatestFlowId && hasLatestGuidance,
    message: 'Context correctly tracks latest flow through chain',
  });
}

// Run all tests
function runTests() {
  testBasicResultInjection();
  testCustomInjectionKey();
  testMetricsInjection();
  testIntelligentContextTransform();
  testConditionalTransformer();
  testResultAccumulation();
  testArtifactInjection();
  testChecklistInjection();
  testNoInjectionWhenEmpty();
  testMultipleTransformations();

  console.log('Phase H Block 3: Flow Result Injection and Propagation Test');
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
