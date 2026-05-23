/**
 * Phase G Block 3 Integration Test - Flow Prerequisites
 * Tests prerequisite validation and flow chaining
 */

import { FlowPrerequisiteValidator } from '../flow-prerequisites';
import { FlowHistoryEntry } from '../flow-history';

interface TestResult {
  test: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

// Test 1: No prerequisites can always execute
function testNoPrerequisites() {
  const canExecute = FlowPrerequisiteValidator.canExecute('flowA_brand_verify' as any, []);
  results.push({
    test: 'Flows with no prerequisites can execute',
    passed: canExecute?.canExecute === true,
    message: canExecute?.reason,
  });
}

// Test 2: Required prerequisites block execution
function testRequiredPrerequisiteBlocks() {
  const history: FlowHistoryEntry[] = [];
  const canExecute = FlowPrerequisiteValidator.canExecute('flowF_design_tokens' as any, history);
  results.push({
    test: 'Required prerequisite (flowA) blocks flowF execution',
    passed: (canExecute?.canExecute === false) && ((canExecute?.reason?.includes('flowA') === true) || (canExecute?.reason?.includes('Brand') === true)),
    message: canExecute?.reason,
  });
}

// Test 3: Completed prerequisites allow execution
function testCompletedPrerequisiteAllows() {
  const history: FlowHistoryEntry[] = [
    {
      flowId: 'flowA_brand_verify',
      flowName: 'Brand Verification',
      status: 'success',
      message: 'Completed',
    },
  ];
  const canExecute = FlowPrerequisiteValidator.canExecute('flowF_design_tokens' as any, history);
  results.push({
    test: 'Completed required prerequisite allows execution',
    passed: canExecute?.canExecute === true,
    message: canExecute?.reason,
  });
}

// Test 4: Optional prerequisites don't block execution
function testOptionalPrerequisiteDoesNotBlock() {
  const history: FlowHistoryEntry[] = [];
  const canExecute = FlowPrerequisiteValidator.canExecute('flowD_reference_inspiration' as any, history);
  results.push({
    test: 'Optional prerequisites do not block execution',
    passed: canExecute?.canExecute === true,
    message: canExecute?.reason,
  });
}

// Test 5: Minimum successful prerequisites enforced
function testMinimumPrerequisitesEnforced() {
  const history: FlowHistoryEntry[] = [];
  const canExecute = FlowPrerequisiteValidator.canExecute('flowL_design_critique' as any, history);
  results.push({
    test: 'Minimum successful prerequisites (min=1) blocks execution',
    passed: (canExecute?.canExecute === false),
    message: canExecute?.reason,
  });
}

// Test 6: Minimum prerequisites satisfied
function testMinimumPrerequisitesSatisfied() {
  const history: FlowHistoryEntry[] = [
    {
      flowId: 'flowK_multi_lens_audit',
      flowName: 'Multi-Lens Audit',
      status: 'success',
      message: 'Completed',
    },
  ];
  const canExecute = FlowPrerequisiteValidator.canExecute('flowL_design_critique' as any, history);
  results.push({
    test: 'Minimum successful prerequisites satisfied',
    passed: canExecute?.canExecute === true,
    message: canExecute?.reason,
  });
}

// Test 7: Context requirements validation
function testContextRequirementsValidation() {
  const contextCheck = FlowPrerequisiteValidator.validateContextRequirements('flowF_design_tokens' as any, {});
  results.push({
    test: 'Context requirements validation detects missing projectPath',
    passed: (contextCheck?.valid === false) && (contextCheck?.missing?.includes('projectPath') === true),
    message: `Missing: ${contextCheck?.missing?.join(', ')}`,
  });
}

// Test 8: Context requirements satisfied
function testContextRequirementsSatisfied() {
  const contextCheck = FlowPrerequisiteValidator.validateContextRequirements('flowF_design_tokens' as any, {
    projectPath: '/project',
    designTokens: { primary: '#3b82f6' },
  });
  results.push({
    test: 'Context requirements satisfied',
    passed: contextCheck?.valid === true,
    message: contextCheck?.missing?.join(', '),
  });
}

// Test 9: Prerequisite chain generation
function testPrerequisiteChain() {
  const chain = FlowPrerequisiteValidator.getPrerequisiteChain('flowI_accessibility' as any);
  const hasRequired = chain.includes('flowB_component_research' as any) &&
                     chain.includes('flowG_component_implementation' as any) &&
                     chain.includes('flowI_accessibility' as any);
  results.push({
    test: 'Prerequisite chain includes all required flows',
    passed: hasRequired,
    message: `Chain: ${chain.join(' -> ')}`,
  });
}

// Test 10: Dependency retrieval
function testDependencyRetrieval() {
  const deps = FlowPrerequisiteValidator.getDependencies('flowF_design_tokens' as any);
  results.push({
    test: 'Dependency retrieval returns correct structure',
    passed: (deps !== null) && ((deps?.prerequisites.length || 0) > 0) && (deps?.prerequisites[0].flowId === 'flowA_brand_verify'),
    message: `Prerequisites count: ${deps?.prerequisites.length}`,
  });
}

// Run all tests
function runTests() {
  testNoPrerequisites();
  testRequiredPrerequisiteBlocks();
  testCompletedPrerequisiteAllows();
  testOptionalPrerequisiteDoesNotBlock();
  testMinimumPrerequisitesEnforced();
  testMinimumPrerequisitesSatisfied();
  testContextRequirementsValidation();
  testContextRequirementsSatisfied();
  testPrerequisiteChain();
  testDependencyRetrieval();

  console.log('Phase G Block 3 Prerequisites Integration Test');
  console.log('='.repeat(50));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  for (const result of results) {
    const statusSymbol = result.passed ? '✓' : '✗';
    console.log(`${statusSymbol} ${result.test}`);
    if (result.message) {
      console.log(`  ${result.message}`);
    }
  }

  console.log('='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
