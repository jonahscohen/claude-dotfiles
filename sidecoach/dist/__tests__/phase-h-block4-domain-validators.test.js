"use strict";
/**
 * Phase H Block 4 Integration Test - Custom Domain Validators
 * Tests domain-specific validation rules and validation logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
const flow_composition_1 = require("../flow-composition");
const results = [];
function createTestResult(flowId, status = 'success', guidance = [], checklist = [], artifacts = []) {
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
function testCreateValidationRule() {
    const rule = flow_composition_1.FlowCompositionEngine.createValidationRule('has_guidance', 'Result must include guidance', (result) => (result.guidance && result.guidance.length > 0));
    const test1 = rule.name === 'has_guidance';
    const test2 = rule.description === 'Result must include guidance';
    const test3 = typeof rule.validate === 'function';
    results.push({
        test: 'Create validation rule with name, description, and function',
        passed: test1 && test2 && test3,
        message: 'Rule created successfully',
    });
}
function testCreateDomainValidator() {
    const rule1 = flow_composition_1.FlowCompositionEngine.createValidationRule('rule1', 'Test rule 1', () => true);
    const rule2 = flow_composition_1.FlowCompositionEngine.createValidationRule('rule2', 'Test rule 2', () => true);
    const validator = flow_composition_1.FlowCompositionEngine.createDomainValidator('accessibility', [rule1, rule2], false);
    const test1 = validator.domain === 'accessibility';
    const test2 = validator.rules.length === 2;
    const test3 = (validator.failOnFirstError ?? false) === false;
    results.push({
        test: 'Create domain validator with domain, rules, and failOnFirstError flag',
        passed: test1 && test2 && test3,
        message: 'Domain validator created successfully',
    });
}
function testRegisterAndRetrieveValidator() {
    const engine = new flow_composition_1.FlowCompositionEngine();
    const rule = flow_composition_1.FlowCompositionEngine.createValidationRule('test', 'test', () => true);
    const validator = flow_composition_1.FlowCompositionEngine.createDomainValidator('performance', [rule]);
    engine.registerDomainValidator(validator);
    const retrieved = engine.getDomainValidator('performance');
    const test1 = retrieved !== null;
    const test2 = (retrieved?.domain ?? '') === 'performance';
    const test3 = (retrieved?.rules?.length ?? 0) === 1;
    results.push({
        test: 'Register and retrieve domain validator by domain name',
        passed: test1 && test2 && test3,
        message: 'Validator retrieved successfully',
    });
}
function testValidateResultPass() {
    const engine = new flow_composition_1.FlowCompositionEngine();
    const rule1 = flow_composition_1.FlowCompositionEngine.createValidationRule('has_guidance', 'Has guidance', (result) => (result.guidance && result.guidance.length > 0));
    const rule2 = flow_composition_1.FlowCompositionEngine.createValidationRule('has_checklist', 'Has checklist', (result) => (result.checklist && result.checklist.length > 0));
    const validator = flow_composition_1.FlowCompositionEngine.createDomainValidator('accessibility', [rule1, rule2]);
    engine.registerDomainValidator(validator);
    const result = createTestResult('flowI_accessibility', 'success', ['Accessible colors'], [{ task: 'Test keyboard navigation' }]);
    const validation = engine.validateResult('accessibility', result);
    const test1 = validation.status === 'pass';
    const test2 = (validation.passedRules?.length ?? 0) === 2;
    const test3 = (validation.failedRules?.length ?? 0) === 0;
    results.push({
        test: 'Validate result with all passing rules returns pass status',
        passed: test1 && test2 && test3,
        message: `2 rules passed: ${(validation.passedRules ?? []).join(', ')}`,
    });
}
function testValidateResultFail() {
    const engine = new flow_composition_1.FlowCompositionEngine();
    const rule1 = flow_composition_1.FlowCompositionEngine.createValidationRule('has_guidance', 'Has guidance', (result) => (result.guidance && result.guidance.length > 0));
    const rule2 = flow_composition_1.FlowCompositionEngine.createValidationRule('has_checklist', 'Has checklist', (result) => (result.checklist && result.checklist.length > 0));
    const validator = flow_composition_1.FlowCompositionEngine.createDomainValidator('accessibility', [rule1, rule2]);
    engine.registerDomainValidator(validator);
    const result = createTestResult('flowI_accessibility', 'success', [], []);
    const validation = engine.validateResult('accessibility', result);
    const test1 = validation.status === 'fail';
    const test2 = (validation.passedRules?.length ?? 0) === 0;
    const test3 = (validation.failedRules?.length ?? 0) === 2;
    results.push({
        test: 'Validate result with all failing rules returns fail status',
        passed: test1 && test2 && test3,
        message: `2 rules failed: ${(validation.failedRules ?? []).join(', ')}`,
    });
}
function testValidateResultPartial() {
    const engine = new flow_composition_1.FlowCompositionEngine();
    const rule1 = flow_composition_1.FlowCompositionEngine.createValidationRule('has_guidance', 'Has guidance', (result) => (result.guidance && result.guidance.length > 0));
    const rule2 = flow_composition_1.FlowCompositionEngine.createValidationRule('has_checklist', 'Has checklist', (result) => (result.checklist && result.checklist.length > 0));
    const rule3 = flow_composition_1.FlowCompositionEngine.createValidationRule('has_artifacts', 'Has artifacts', (result) => (result.artifacts && result.artifacts.length > 0));
    const validator = flow_composition_1.FlowCompositionEngine.createDomainValidator('accessibility', [rule1, rule2, rule3]);
    engine.registerDomainValidator(validator);
    const result = createTestResult('flowI_accessibility', 'success', ['Guidance provided'], []);
    const validation = engine.validateResult('accessibility', result);
    const test1 = validation.status === 'partial';
    const test2 = (validation.passedRules?.length ?? 0) === 1;
    const test3 = (validation.failedRules?.length ?? 0) === 2;
    results.push({
        test: 'Validate result with mixed pass/fail returns partial status',
        passed: test1 && test2 && test3,
        message: '1 passed, 2 failed',
    });
}
function testMultipleDomainValidation() {
    const engine = new flow_composition_1.FlowCompositionEngine();
    const a11yRule = flow_composition_1.FlowCompositionEngine.createValidationRule('a11y_guidance', 'Has a11y guidance', (result) => (result.guidance && result.guidance.length > 0));
    const perfRule = flow_composition_1.FlowCompositionEngine.createValidationRule('perf_checklist', 'Has perf checklist', (result) => (result.checklist && result.checklist.length > 0));
    const a11yValidator = flow_composition_1.FlowCompositionEngine.createDomainValidator('accessibility', [a11yRule]);
    const perfValidator = flow_composition_1.FlowCompositionEngine.createDomainValidator('performance', [perfRule]);
    engine.registerDomainValidator(a11yValidator);
    engine.registerDomainValidator(perfValidator);
    const result = createTestResult('flowI_accessibility', 'success', ['Guidance'], [{ task: 'Check performance' }]);
    const validations = engine.validateMultipleDomains(['accessibility', 'performance'], result);
    const test1 = (validations?.length ?? 0) === 2;
    const test2 = (validations?.[0]?.status ?? '') === 'pass';
    const test3 = (validations?.[1]?.status ?? '') === 'pass';
    results.push({
        test: 'Multiple domain validation validates against all domains',
        passed: test1 && test2 && test3,
        message: `${(validations?.length ?? 0)} domains validated`,
    });
}
function testAllValidationsPassed() {
    const passedValidations = [
        { status: 'pass', domain: 'accessibility' },
        { status: 'pass', domain: 'performance' },
    ];
    const mixedValidations = [
        { status: 'pass', domain: 'accessibility' },
        { status: 'partial', domain: 'performance' },
    ];
    const test1 = flow_composition_1.FlowCompositionEngine.allValidationsPassed(passedValidations) === true;
    const test2 = flow_composition_1.FlowCompositionEngine.allValidationsPassed(mixedValidations) === false;
    results.push({
        test: 'allValidationsPassed correctly identifies all-pass vs mixed statuses',
        passed: test1 && test2,
        message: 'Validation status checking works correctly',
    });
}
function testFailOnFirstError() {
    const engine = new flow_composition_1.FlowCompositionEngine();
    const rule1 = flow_composition_1.FlowCompositionEngine.createValidationRule('rule1', 'Rule 1', () => false);
    const rule2 = flow_composition_1.FlowCompositionEngine.createValidationRule('rule2', 'Rule 2', () => false);
    const validator = flow_composition_1.FlowCompositionEngine.createDomainValidator('test_domain', [rule1, rule2], true);
    engine.registerDomainValidator(validator);
    const result = createTestResult('flowA_brand_verify');
    const validation = engine.validateResult('test_domain', result);
    const test1 = (validation.failedRules?.length ?? 0) === 1;
    const test2 = validation.status === 'partial';
    results.push({
        test: 'failOnFirstError flag stops validation on first failure',
        passed: test1 && test2,
        message: 'Validation stopped after first failure',
    });
}
function testNoValidatorRegistered() {
    const engine = new flow_composition_1.FlowCompositionEngine();
    const result = createTestResult('flowA_brand_verify');
    const validation = engine.validateResult('unregistered_domain', result);
    const test1 = validation.status === 'pass';
    const test2 = (validation.passedRules?.length ?? 0) === 0;
    const test3 = (validation.failedRules?.length ?? 0) === 0;
    results.push({
        test: 'Unregistered domain validator returns pass with no rules',
        passed: test1 && test2 && test3,
        message: 'No validator = automatic pass (forward compatible)',
    });
}
function runTests() {
    testCreateValidationRule();
    testCreateDomainValidator();
    testRegisterAndRetrieveValidator();
    testValidateResultPass();
    testValidateResultFail();
    testValidateResultPartial();
    testMultipleDomainValidation();
    testAllValidationsPassed();
    testFailOnFirstError();
    testNoValidatorRegistered();
    console.log('Phase H Block 4: Custom Domain Validators Test');
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
//# sourceMappingURL=phase-h-block4-domain-validators.test.js.map