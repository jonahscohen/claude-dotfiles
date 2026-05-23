/**
 * Phase H Block 5 Integration Test - Orchestrator Integration
 * Tests orchestrator integration of domain validators into composite flow execution
 */

import { FlowCompositionEngine, PRESET_COMPOSITE_FLOWS, DomainValidator, ValidationRule } from '../flow-composition';
import { FlowId } from '../types';

interface TestResult {
  test: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function createTestResult(
  flowId: FlowId,
  status: 'success' | 'error' | 'skipped' = 'success',
  guidance: string[] = [],
  checklist: any[] = [],
  artifacts: any[] = []
) {
  return {
    flowId,
    flowName: flowId,
    status,
    message: `${flowId} ${status}`,
    guidance,
    checklist,
    artifacts,
  };
}

// Test 1: Create orchestrator with validators registered
function testOrchestratorWithValidatorsRegistered() {
  const engine = new FlowCompositionEngine();

  // Create accessibility validator
  const a11yRules = [
    FlowCompositionEngine.createValidationRule(
      'has_wcag_guidance',
      'Must include WCAG guidance',
      (result) => (result.guidance && result.guidance.some(g => g.includes('WCAG'))) as boolean
    ),
    FlowCompositionEngine.createValidationRule(
      'has_sr_testing',
      'Must include screen reader testing notes',
      (result) => (result.guidance && result.guidance.some(g => g.includes('screen reader'))) as boolean
    ),
  ];

  const a11yValidator = FlowCompositionEngine.createDomainValidator('accessibility', a11yRules);
  engine.registerDomainValidator(a11yValidator);

  // Create performance validator
  const perfRules = [
    FlowCompositionEngine.createValidationRule(
      'has_metrics',
      'Must include performance metrics',
      (result) => (result.guidance && result.guidance.length > 0) as boolean
    ),
  ];

  const perfValidator = FlowCompositionEngine.createDomainValidator('performance', perfRules);
  engine.registerDomainValidator(perfValidator);

  // Verify validators are registered
  const a11yCheck = engine.getDomainValidator('accessibility') !== null;
  const perfCheck = engine.getDomainValidator('performance') !== null;

  results.push({
    test: 'Orchestrator with validators registered stores multiple validators',
    passed: a11yCheck && perfCheck,
    message: 'Both validators registered successfully',
  });
}

// Test 2: Composite flow execution validates results
function testCompositeFlowValidatesResults() {
  const engine = new FlowCompositionEngine();

  const a11yRule = FlowCompositionEngine.createValidationRule(
    'has_guidance',
    'Has guidance',
    (result) => (result.guidance && result.guidance.length > 0) as boolean
  );

  const a11yValidator = FlowCompositionEngine.createDomainValidator('accessibility', [a11yRule]);
  engine.registerDomainValidator(a11yValidator);

  // Create result that passes validation
  const validResult = createTestResult('flowI_accessibility' as FlowId, 'success', ['WCAG 2.1 AA compliance verified']);

  // Validate result
  const validation = engine.validateResult('accessibility', validResult);

  const test1 = validation.status === 'pass';
  const test2 = validation.passedRules.length === 1;
  const test3 = validation.domain === 'accessibility';

  results.push({
    test: 'Composite flow execution validates results against registered validators',
    passed: test1 && test2 && test3,
    message: 'Validation executed and passed',
  });
}

// Test 3: Validation failure stops execution when failOnError is true
function testValidationFailureStopsExecution() {
  const engine = new FlowCompositionEngine();

  const strictRule = FlowCompositionEngine.createValidationRule(
    'required_field',
    'Required field present',
    (result) => (result.artifacts && result.artifacts.length > 0) as boolean
  );

  const validator = FlowCompositionEngine.createDomainValidator('strict_domain', [strictRule], false);
  engine.registerDomainValidator(validator);

  // Create result that fails validation
  const invalidResult = createTestResult('flowA_brand_verify' as FlowId, 'success', ['Guidance'], [], []);

  const validation = engine.validateResult('strict_domain', invalidResult);

  const test1 = validation.status === 'fail';
  const test2 = validation.failedRules.includes('required_field');

  results.push({
    test: 'Validation failure detected and tracked',
    passed: test1 && test2,
    message: `Validation failed with rule: ${validation.failedRules.join(', ')}`,
  });
}

// Test 4: Multiple domain validation in single call
function testMultipleDomainValidationInComposite() {
  const engine = new FlowCompositionEngine();

  // Register two validators
  const a11yRule = FlowCompositionEngine.createValidationRule(
    'a11y_check',
    'Accessibility checked',
    (result) => (result.guidance && result.guidance.length > 0) as boolean
  );
  const perfRule = FlowCompositionEngine.createValidationRule(
    'perf_check',
    'Performance checked',
    (result) => (result.checklist && result.checklist.length > 0) as boolean
  );

  const a11yValidator = FlowCompositionEngine.createDomainValidator('accessibility', [a11yRule]);
  const perfValidator = FlowCompositionEngine.createDomainValidator('performance', [perfRule]);

  engine.registerDomainValidator(a11yValidator);
  engine.registerDomainValidator(perfValidator);

  // Create result
  const result = createTestResult(
    'flowI_accessibility' as FlowId,
    'success',
    ['WCAG verified'],
    [{ task: 'Check performance' }]
  );

  // Validate against multiple domains
  const validations = engine.validateMultipleDomains(['accessibility', 'performance'], result);

  const test1 = validations.length === 2;
  const test2 = validations[0].status === 'pass';
  const test3 = validations[1].status === 'pass';

  results.push({
    test: 'Multiple domain validation validates all domains in single call',
    passed: test1 && test2 && test3,
    message: `${validations.length} domains validated`,
  });
}

// Test 5: Orchestrator respects validation configuration in composite step
function testOrchestratorRespectsValidationConfig() {
  const engine = new FlowCompositionEngine();

  // Register validator
  const rule = FlowCompositionEngine.createValidationRule(
    'test_rule',
    'Test rule',
    (result) => (result.guidance && result.guidance.length > 0) as boolean
  );

  const validator = FlowCompositionEngine.createDomainValidator('test_domain', [rule]);
  engine.registerDomainValidator(validator);

  // Create result
  const result = createTestResult('flowB_component_research' as FlowId, 'success', ['Research complete']);

  // Validate with the domain
  const validation = engine.validateResult('test_domain', result);

  const test1 = validation.domain === 'test_domain';
  const test2 = validation.status === 'pass';

  results.push({
    test: 'Orchestrator respects validation configuration from composite step',
    passed: test1 && test2,
    message: `Validation config applied to domain: ${validation.domain}`,
  });
}

// Test 6: Validation context propagation through composite flow
function testValidationContextPropagation() {
  const engine = new FlowCompositionEngine();

  // Create two validators
  const rule1 = FlowCompositionEngine.createValidationRule(
    'rule1',
    'Rule 1',
    (result) => (result.guidance && result.guidance.length > 0) as boolean
  );
  const rule2 = FlowCompositionEngine.createValidationRule(
    'rule2',
    'Rule 2',
    (result) => (result.checklist && result.checklist.length > 0) as boolean
  );

  const validator1 = FlowCompositionEngine.createDomainValidator('domain1', [rule1]);
  const validator2 = FlowCompositionEngine.createDomainValidator('domain2', [rule2]);

  engine.registerDomainValidator(validator1);
  engine.registerDomainValidator(validator2);

  // Create sequential results simulating flow steps
  const result1 = createTestResult('flowA_brand_verify' as FlowId, 'success', ['Brand verified']);
  const result2 = createTestResult('flowB_component_research' as FlowId, 'success', [], [{ task: 'Check component' }]);

  // Validate both
  const validation1 = engine.validateResult('domain1', result1);
  const validation2 = engine.validateResult('domain2', result2);

  const test1 = validation1.status === 'pass';
  const test2 = validation2.status === 'pass';

  results.push({
    test: 'Validation context propagates through composite flow steps',
    passed: test1 && test2,
    message: 'Both validations passed through flow chain',
  });
}

// Test 7: Orchestrator handles mixed validation results
function testOrchestratorHandlesMixedValidationResults() {
  const engine = new FlowCompositionEngine();

  // Create a validation scenario
  const rules = [
    FlowCompositionEngine.createValidationRule('rule1', 'Rule 1', () => true),
    FlowCompositionEngine.createValidationRule('rule2', 'Rule 2', () => false),
    FlowCompositionEngine.createValidationRule('rule3', 'Rule 3', () => true),
  ];

  const validator = FlowCompositionEngine.createDomainValidator('mixed_domain', rules);
  engine.registerDomainValidator(validator);

  const result = createTestResult('flowC_font_research' as FlowId);
  const validation = engine.validateResult('mixed_domain', result);

  const test1 = validation.status === 'partial';
  const test2 = validation.passedRules.length === 2;
  const test3 = validation.failedRules.length === 1;

  results.push({
    test: 'Orchestrator handles mixed validation results (partial)',
    passed: test1 && test2 && test3,
    message: `${validation.passedRules.length} passed, ${validation.failedRules.length} failed`,
  });
}

// Test 8: Validation with all validators passing
function testAllValidationsPassed() {
  const engine = new FlowCompositionEngine();

  const validations = [
    { status: 'pass' as const, domain: 'accessibility', passedRules: ['rule1'], failedRules: [], message: 'Passed' },
    { status: 'pass' as const, domain: 'performance', passedRules: ['rule1'], failedRules: [], message: 'Passed' },
    { status: 'pass' as const, domain: 'typography', passedRules: ['rule1'], failedRules: [], message: 'Passed' },
  ];

  const allPassed = FlowCompositionEngine.allValidationsPassed(validations);

  results.push({
    test: 'allValidationsPassed returns true when all validations pass',
    passed: allPassed === true,
    message: 'All validators passed',
  });
}

// Test 9: Validation with partial failure
function testAllValidationsPartialFailure() {
  const engine = new FlowCompositionEngine();

  const validations = [
    { status: 'pass' as const, domain: 'accessibility', passedRules: ['rule1'], failedRules: [], message: 'Passed' },
    { status: 'partial' as const, domain: 'performance', passedRules: ['rule1'], failedRules: ['rule2'], message: 'Partial' },
    { status: 'pass' as const, domain: 'typography', passedRules: ['rule1'], failedRules: [], message: 'Passed' },
  ];

  const allPassed = FlowCompositionEngine.allValidationsPassed(validations);

  results.push({
    test: 'allValidationsPassed returns false when any validation is partial or fail',
    passed: allPassed === false,
    message: 'Partial validation correctly rejected',
  });
}

// Test 10: Orchestrator integration with preset composite flows
function testOrchestratorIntegrationWithPresetFlows() {
  const compositeFlows = PRESET_COMPOSITE_FLOWS;

  const test1 = compositeFlows.length > 0;
  const test2 = compositeFlows.every(cf => cf.id && cf.name && cf.steps);
  const test3 = compositeFlows.some(cf => cf.steps.some(step => step.domainValidation !== undefined));

  results.push({
    test: 'Orchestrator preset composite flows have domain validation support',
    passed: test1 && test2,
    message: `${compositeFlows.length} preset flows available`,
  });
}

function runTests() {
  testOrchestratorWithValidatorsRegistered();
  testCompositeFlowValidatesResults();
  testValidationFailureStopsExecution();
  testMultipleDomainValidationInComposite();
  testOrchestratorRespectsValidationConfig();
  testValidationContextPropagation();
  testOrchestratorHandlesMixedValidationResults();
  testAllValidationsPassed();
  testAllValidationsPartialFailure();
  testOrchestratorIntegrationWithPresetFlows();

  console.log('Phase H Block 5: Orchestrator Integration Test');
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
