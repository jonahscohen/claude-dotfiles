/**
 * Phase H Block 6 End-to-End Test - Orchestrator Validation Integration
 * Tests complete flow: validator registration → composite flow execution → validation checkpoint
 */

import { FlowCompositionEngine, FlowCompositionStep, CompositeFlowDefinition } from '../flow-composition';
import { FlowId } from '../types';
import { FlowExecutionResult } from '../flow-handler';

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
  checklist: any[] = []
): any {
  return {
    flowId,
    flowName: flowId,
    status,
    message: `${flowId} ${status}`,
    guidance,
    checklist,
    artifacts: [],
  } as any;
}

// Test 1: End-to-end validator registration and composite flow execution
function testE2EValidatorRegistrationAndExecution() {
  const engine = new FlowCompositionEngine();

  // Step 1: Register validators for a custom domain
  const brandRules = [
    FlowCompositionEngine.createValidationRule(
      'has_brand_guidance',
      'Result includes brand verification guidance',
      (result) => (result.guidance && result.guidance.some(g => g.includes('brand'))) as boolean
    ),
    FlowCompositionEngine.createValidationRule(
      'has_design_law',
      'Result includes design law selection',
      (result) => (result.guidance && result.guidance.some(g => g.includes('design law'))) as boolean
    ),
  ];

  const brandValidator = FlowCompositionEngine.createDomainValidator('brand_domain', brandRules);
  engine.registerDomainValidator(brandValidator);

  // Step 2: Execute validator on a flow result
  const validResult = createTestResult(
    'flowA_brand_verify' as FlowId,
    'success',
    ['brand verification complete', 'design law selected']
  );

  const validation = engine.validateResult('brand_domain', validResult);

  // Step 3: Verify validation captured results
  const test1 = validation.domain === 'brand_domain';
  const test2 = validation.status === 'pass';
  const test3 = validation.passedRules.length === 2;
  const test4 = validation.failedRules.length === 0;

  results.push({
    test: 'E2E: Validator registration → execution → result capture',
    passed: test1 && test2 && test3 && test4,
    message: `All ${validation.passedRules.length} rules passed`,
  });
}

// Test 2: Composite flow with validation config stores results
function testCompositeFlowValidationConfigStoresResults() {
  const engine = new FlowCompositionEngine();

  // Register validator
  const rule = FlowCompositionEngine.createValidationRule(
    'has_content',
    'Has content',
    (result) => (result.guidance && result.guidance.length > 0) as boolean
  );

  const validator = FlowCompositionEngine.createDomainValidator('test_domain', [rule]);
  engine.registerDomainValidator(validator);

  // Create composite flow step with validation config
  const step: FlowCompositionStep = {
    flowId: 'flowB_component_research' as FlowId,
    domainValidation: {
      domains: ['test_domain'],
      failOnError: false,
    },
  };

  // Execute validation on flow result
  const result = createTestResult('flowB_component_research' as FlowId, 'success', ['Research completed']);
  const validations = engine.validateMultipleDomains(step.domainValidation!.domains, result);

  // Store in result (simulating orchestrator behavior)
  result.validationResults = validations;

  const test1 = result.validationResults !== undefined;
  const test2 = result.validationResults!.length === 1;
  const test3 = result.validationResults![0].status === 'pass';

  results.push({
    test: 'Composite flow validation config stores results in FlowExecutionResult',
    passed: test1 && test2 && test3,
    message: `Validation results stored: ${result.validationResults!.length} domains`,
  });
}

// Test 3: Validation failure with failOnError halts composition
function testValidationFailureHaltsCompositionWhenConfigured() {
  const engine = new FlowCompositionEngine();

  // Register validator with strict rules
  const strictRule = FlowCompositionEngine.createValidationRule(
    'required_artifacts',
    'Must have artifacts',
    (result) => (result.artifacts && result.artifacts.length > 0) as boolean
  );

  const validator = FlowCompositionEngine.createDomainValidator('strict_domain', [strictRule]);
  engine.registerDomainValidator(validator);

  // Create step with failOnError enabled
  const step: FlowCompositionStep = {
    flowId: 'flowC_font_research' as FlowId,
    domainValidation: {
      domains: ['strict_domain'],
      failOnError: true, // Will halt on failure
    },
  };

  // Execute with result that fails validation
  const result = createTestResult('flowC_font_research' as FlowId, 'success', ['Fonts researched'], []);
  const validations = engine.validateMultipleDomains(step.domainValidation!.domains, result);
  result.validationResults = validations;

  // Check if validation failed
  const validationFailed = !FlowCompositionEngine.allValidationsPassed(validations);
  const shouldHalt = validationFailed && (step.domainValidation?.failOnError ?? false);

  results.push({
    test: 'Validation failure with failOnError=true would halt composition',
    passed: validationFailed && shouldHalt,
    message: 'Validation failed as expected, composition would halt',
  });
}

// Test 4: Multiple validators in sequence
function testMultipleValidatorsInSequence() {
  const engine = new FlowCompositionEngine();

  // Register three different domain validators
  const accessibility = FlowCompositionEngine.createDomainValidator(
    'accessibility',
    [
      FlowCompositionEngine.createValidationRule(
        'wcag',
        'WCAG compliance',
        (result) => (result.guidance && result.guidance.length > 0) as boolean
      ),
    ]
  );

  const performance = FlowCompositionEngine.createDomainValidator(
    'performance',
    [
      FlowCompositionEngine.createValidationRule(
        'metrics',
        'Performance metrics',
        (result) => (result.checklist && result.checklist.length > 0) as boolean
      ),
    ]
  );

  const design = FlowCompositionEngine.createDomainValidator(
    'design',
    [
      FlowCompositionEngine.createValidationRule(
        'tokens',
        'Design tokens',
        () => true // Always pass
      ),
    ]
  );

  engine.registerDomainValidator(accessibility);
  engine.registerDomainValidator(performance);
  engine.registerDomainValidator(design);

  // Execute flow with all three validators
  const result = createTestResult(
    'flowI_accessibility' as FlowId,
    'success',
    ['WCAG AA compliance verified'],
    [{ task: 'Performance check' }]
  );

  const validations = engine.validateMultipleDomains(['accessibility', 'performance', 'design'], result);
  result.validationResults = validations;

  const test1 = validations.length === 3;
  const test2 = validations[0].status === 'pass'; // accessibility
  const test3 = validations[1].status === 'pass'; // performance
  const test4 = validations[2].status === 'pass'; // design

  results.push({
    test: 'Multiple validators execute in sequence on same result',
    passed: test1 && test2 && test3 && test4,
    message: `${validations.length} domains validated, all passed`,
  });
}

// Test 5: Validation with mixed results (some pass, some fail)
function testMixedValidationResultsPartial() {
  const engine = new FlowCompositionEngine();

  // Create a domain with multiple rules
  const complexRule1 = FlowCompositionEngine.createValidationRule(
    'rule1',
    'Rule 1 - Pass',
    () => true // Pass
  );

  const complexRule2 = FlowCompositionEngine.createValidationRule(
    'rule2',
    'Rule 2 - Fail',
    () => false // Fail
  );

  const complexRule3 = FlowCompositionEngine.createValidationRule(
    'rule3',
    'Rule 3 - Pass',
    () => true // Pass
  );

  const validator = FlowCompositionEngine.createDomainValidator('complex_domain', [
    complexRule1,
    complexRule2,
    complexRule3,
  ]);

  engine.registerDomainValidator(validator);

  const result = createTestResult('flowD_reference_inspiration' as FlowId);
  const validation = engine.validateResult('complex_domain', result);

  // Verify partial status
  const test1 = validation.status === 'partial';
  const test2 = validation.passedRules.length === 2;
  const test3 = validation.failedRules.length === 1;
  const test4 = validation.failedRules.includes('rule2');

  results.push({
    test: 'Mixed validation results detected (2 pass, 1 fail = partial)',
    passed: test1 && test2 && test3 && test4,
    message: `Status: ${validation.status}, Passed: ${validation.passedRules.length}, Failed: ${validation.failedRules.length}`,
  });
}

// Test 6: Validation context flows through execution
function testValidationContextFlowsThrough() {
  const engine = new FlowCompositionEngine();

  // Register validators for three domains
  const domains = ['domain1', 'domain2', 'domain3'];

  for (const domain of domains) {
    const rule = FlowCompositionEngine.createValidationRule(
      `rule_${domain}`,
      `Rule for ${domain}`,
      () => true
    );
    const validator = FlowCompositionEngine.createDomainValidator(domain, [rule]);
    engine.registerDomainValidator(validator);
  }

  // Execute all validations on same result
  const result = createTestResult('flowE_motion_patterns' as FlowId);
  const validations = engine.validateMultipleDomains(domains, result);

  // Simulate storing in result object
  result.validationResults = validations;

  // Verify all domains were validated
  const test1 = result.validationResults!.length === 3;
  const test2 = result.validationResults!.every((v: any) => v.status === 'pass');
  const test3 = result.validationResults!.map((v: any) => v.domain).sort().join(',') === 'domain1,domain2,domain3';

  results.push({
    test: 'Validation context flows through multiple domains',
    passed: test1 && test2 && test3,
    message: `${result.validationResults!.length} domains validated and stored`,
  });
}

// Test 7: Orchestrator decision points based on validation
function testOrchestratorDecisionPointsBasedOnValidation() {
  const engine = new FlowCompositionEngine();

  // Create two scenarios: pass and fail
  const rule = FlowCompositionEngine.createValidationRule(
    'decision_rule',
    'Determines next step',
    (result) => (result.guidance && result.guidance.length > 0) as boolean
  );

  const validator = FlowCompositionEngine.createDomainValidator('decision_domain', [rule]);
  engine.registerDomainValidator(validator);

  // Scenario 1: Validation passes - continue composition
  const passingResult = createTestResult('flowF_design_tokens' as FlowId, 'success', ['Tokens generated']);
  const passingValidation = engine.validateResult('decision_domain', passingResult);
  const shouldContinue = FlowCompositionEngine.allValidationsPassed([passingValidation]);

  // Scenario 2: Validation fails - halt composition
  const failingResult = createTestResult('flowG_component_implementation' as FlowId, 'success', []);
  const failingValidation = engine.validateResult('decision_domain', failingResult);
  const shouldHalt = !FlowCompositionEngine.allValidationsPassed([failingValidation]);

  results.push({
    test: 'Orchestrator can make routing decisions based on validation',
    passed: shouldContinue && shouldHalt,
    message: 'Pass → continue, Fail → halt logic verified',
  });
}

// Test 8: Validation results preservation through composition
function testValidationResultsPreservedThroughComposition() {
  const engine = new FlowCompositionEngine();

  // Register validators
  const rule1 = FlowCompositionEngine.createValidationRule('test1', 'Test 1', () => true);
  const rule2 = FlowCompositionEngine.createValidationRule('test2', 'Test 2', () => false);

  const validator = FlowCompositionEngine.createDomainValidator('preservation_domain', [rule1, rule2]);
  engine.registerDomainValidator(validator);

  // Execute three flows in sequence, tracking validation
  const results_array: any[] = [];

  const result1 = createTestResult('flowH_motion_integration' as FlowId);
  const val1 = engine.validateResult('preservation_domain', result1);
  result1.validationResults = [val1];
  results_array.push(result1);

  const result2 = createTestResult('flowI_accessibility' as FlowId);
  const val2 = engine.validateResult('preservation_domain', result2);
  result2.validationResults = [val2];
  results_array.push(result2);

  const result3 = createTestResult('flowJ_tactical_polish' as FlowId);
  const val3 = engine.validateResult('preservation_domain', result3);
  result3.validationResults = [val3];
  results_array.push(result3);

  // Verify all validation results preserved
  const test1 = results_array.every(r => r.validationResults !== undefined);
  const test2 = results_array.every(r => r.validationResults!.length === 1);
  const test3 = results_array[0].validationResults![0].passedRules.length === 1;
  const test4 = results_array[0].validationResults![0].failedRules.length === 1;

  results.push({
    test: 'Validation results preserved through composition sequence',
    passed: test1 && test2 && test3 && test4,
    message: `${results_array.length} flows tracked with validation results`,
  });
}

function runTests() {
  testE2EValidatorRegistrationAndExecution();
  testCompositeFlowValidationConfigStoresResults();
  testValidationFailureHaltsCompositionWhenConfigured();
  testMultipleValidatorsInSequence();
  testMixedValidationResultsPartial();
  testValidationContextFlowsThrough();
  testOrchestratorDecisionPointsBasedOnValidation();
  testValidationResultsPreservedThroughComposition();

  console.log('Phase H Block 6: E2E Orchestrator Validation Integration Test');
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
