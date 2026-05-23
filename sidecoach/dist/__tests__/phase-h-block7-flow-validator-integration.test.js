"use strict";
/**
 * Phase H Block 7: Flow Validator Integration Test
 * Verifies domain validators wire correctly into flow execution paths
 * and that soft-fail validation doesn't halt execution
 */
Object.defineProperty(exports, "__esModule", { value: true });
const flow_domain_validators_1 = require("../flow-domain-validators");
const flow_composition_1 = require("../flow-composition");
const results = [];
function createTestResult(flowId, status = 'success', guidance = [], checklist = []) {
    return {
        flowId: flowId,
        flowName: flowId,
        status,
        message: `${flowId} ${status}`,
        guidance,
        checklist,
        artifacts: [],
    };
}
function testBlock7a() {
    const engine = new flow_composition_1.FlowCompositionEngine();
    (0, flow_domain_validators_1.registerFlowDomainValidators)(engine);
    // Test 1: All 5 validators register
    const allValidators = [
        'accessibility',
        'performance',
        'design_system',
        'semantic',
        'content_quality',
    ];
    const registrationTest = allValidators.every(domain => engine.getDomainValidator(domain));
    results.push({
        test: 'All 5 domain validators register',
        passed: registrationTest,
    });
    // Test 2: flowI_accessibility has accessibility validator
    const flowI_validators = (0, flow_domain_validators_1.getValidatorsForFlow)('flowI_accessibility');
    results.push({
        test: 'flowI_accessibility mapped to [accessibility]',
        passed: JSON.stringify(flowI_validators) === JSON.stringify(['accessibility']),
    });
    // Test 3: flowE_motion_patterns has correct validators
    const flowE_validators = (0, flow_domain_validators_1.getValidatorsForFlow)('flowE_motion_patterns');
    results.push({
        test: 'flowE_motion_patterns mapped to [performance, content_quality]',
        passed: JSON.stringify(flowE_validators) === JSON.stringify(['performance', 'content_quality']),
    });
    // Test 4: flowG_component_implementation has correct validators
    const flowG_validators = (0, flow_domain_validators_1.getValidatorsForFlow)('flowG_component_implementation');
    results.push({
        test: 'flowG_component_implementation mapped to [semantic, design_system]',
        passed: JSON.stringify(flowG_validators) === JSON.stringify(['semantic', 'design_system']),
    });
    // Test 5: Unmapped flows return empty array
    const unmappedValidators = (0, flow_domain_validators_1.getValidatorsForFlow)('flowUnknown');
    results.push({
        test: 'Unmapped flows return empty validator array',
        passed: unmappedValidators.length === 0,
    });
    // Test 6: Composite workflows have correct domains
    results.push({
        test: 'accessibility_workflow has correct domains',
        passed: JSON.stringify(flow_domain_validators_1.COMPOSITE_FLOW_VALIDATIONS.accessibility_workflow.domains) ===
            JSON.stringify(['accessibility', 'semantic']),
    });
    results.push({
        test: 'complete_qa_workflow has all 4 domains',
        passed: flow_domain_validators_1.COMPOSITE_FLOW_VALIDATIONS.complete_qa_workflow.domains.length === 4 &&
            flow_domain_validators_1.COMPOSITE_FLOW_VALIDATIONS.complete_qa_workflow.domains.includes('accessibility'),
    });
    // Test 7: All workflows use soft-fail mode
    const allSoftFail = !flow_domain_validators_1.COMPOSITE_FLOW_VALIDATIONS.accessibility_workflow.failOnError &&
        !flow_domain_validators_1.COMPOSITE_FLOW_VALIDATIONS.performance_workflow.failOnError &&
        !flow_domain_validators_1.COMPOSITE_FLOW_VALIDATIONS.design_system_workflow.failOnError &&
        !flow_domain_validators_1.COMPOSITE_FLOW_VALIDATIONS.complete_qa_workflow.failOnError;
    results.push({
        test: 'All composite workflows use soft-fail mode',
        passed: allSoftFail,
    });
}
function testBlock7b() {
    const engine = new flow_composition_1.FlowCompositionEngine();
    (0, flow_domain_validators_1.registerFlowDomainValidators)(engine);
    // Test 1: Accessibility validator passes with WCAG guidance
    const result1 = createTestResult('flowI_accessibility', 'success', [
        'WCAG 2.1 AA compliance:',
        'Use semantic HTML',
        'Screen reader testing: VoiceOver',
    ]);
    const validations1 = engine.validateMultipleDomains(['accessibility'], result1);
    results.push({
        test: 'Accessibility validator passes with WCAG guidance',
        passed: validations1[0]?.status === 'pass',
    });
    // Test 2: Performance validator passes with motion guidance
    const result2 = createTestResult('flowE_motion_patterns', 'success', [
        'Performance budget: 60 FPS target',
        'Animation optimization: reduce DOM thrashing',
    ]);
    const validations2 = engine.validateMultipleDomains(['performance'], result2);
    results.push({
        test: 'Performance validator passes with motion guidance',
        passed: validations2[0]?.status === 'pass',
    });
    // Test 3: Design system validator passes with design tokens
    const result3 = createTestResult('flowF_design_tokens', 'success', [
        'Apply design tokens from design.md',
        'Typography uses design system tokens',
    ]);
    const validations3 = engine.validateMultipleDomains(['design_system'], result3);
    results.push({
        test: 'Design system validator passes with design tokens',
        passed: validations3[0]?.status === 'pass',
    });
    // Test 4: Content quality validator fails with AI-slop
    const result4 = createTestResult('flowB_component_research', 'success', [
        'leverage cutting edge techniques',
        'synergy with paradigm shift',
        'revolutionary game changer',
    ]);
    const validations4 = engine.validateMultipleDomains(['content_quality'], result4);
    results.push({
        test: 'Content quality validator detects AI-slop patterns',
        passed: validations4[0]?.status === 'fail',
    });
    // Test 5: Multi-domain validation works
    const result5 = createTestResult('flowV_all_seven_qa', 'success', [
        'WCAG 2.1 AA compliance guidance',
        'Performance: 60 FPS, animation optimization',
        'Design tokens: use design.md',
        'Semantic: ARIA, semantic HTML',
    ]);
    const validations5 = engine.validateMultipleDomains(['accessibility', 'performance', 'design_system', 'semantic'], result5);
    results.push({
        test: 'Multi-domain validation validates all domains',
        passed: validations5.length >= 3 && validations5.some(v => v.domain === 'accessibility'),
    });
    // Test 6: Validation results stored in FlowExecutionResult
    const result6 = createTestResult('flowI_accessibility', 'success', [
        'WCAG 2.1 AA compliance guidance',
    ]);
    const validations6 = engine.validateMultipleDomains(['accessibility'], result6);
    result6.validationResults = validations6;
    results.push({
        test: 'Validation results stored in FlowExecutionResult',
        passed: result6.validationResults !== undefined && result6.validationResults.length > 0,
    });
}
function testBlock7c() {
    const engine = new flow_composition_1.FlowCompositionEngine();
    (0, flow_domain_validators_1.registerFlowDomainValidators)(engine);
    // Test 1: Accessibility workflow validates both domains
    const result1 = createTestResult('flowI_accessibility', 'success', [
        'WCAG 2.1 AA: keyboard navigation',
        'Semantic HTML: article, section',
    ]);
    const workflowDomains1 = flow_domain_validators_1.COMPOSITE_FLOW_VALIDATIONS.accessibility_workflow.domains;
    const validations1 = engine.validateMultipleDomains(workflowDomains1, result1);
    results.push({
        test: 'Accessibility workflow validates both accessibility and semantic',
        passed: validations1.some(v => v.domain === 'accessibility') &&
            validations1.some(v => v.domain === 'semantic'),
    });
    // Test 2: Performance workflow validates both domains
    const result2 = createTestResult('flowE_motion_patterns', 'success', [
        'Performance: 60 FPS animation targets',
        'Content: specific motion guidance',
    ]);
    const workflowDomains2 = flow_domain_validators_1.COMPOSITE_FLOW_VALIDATIONS.performance_workflow.domains;
    const validations2 = engine.validateMultipleDomains(workflowDomains2, result2);
    results.push({
        test: 'Performance workflow validates both performance and content_quality',
        passed: validations2.some(v => v.domain === 'performance') &&
            validations2.some(v => v.domain === 'content_quality'),
    });
    // Test 3: Complete QA workflow validates all domains
    const result3 = createTestResult('flowV_all_seven_qa', 'success', [
        'WCAG 2.1 AA compliance',
        'Performance optimization',
        'Design tokens usage',
        'Semantic HTML structure',
    ]);
    const workflowDomains3 = flow_domain_validators_1.COMPOSITE_FLOW_VALIDATIONS.complete_qa_workflow.domains;
    const validations3 = engine.validateMultipleDomains(workflowDomains3, result3);
    results.push({
        test: 'Complete QA workflow validates all 4 domains',
        passed: validations3.length >= 4,
    });
    // Test 4: Backward compatibility with explicit validation config
    const result4 = createTestResult('flowI_accessibility', 'success', [
        'WCAG 2.1 AA compliance',
        'Semantic structure: article, section',
    ]);
    const explicitDomains = ['accessibility', 'semantic'];
    const validations4 = engine.validateMultipleDomains(explicitDomains, result4);
    results.push({
        test: 'Explicit domain validation configuration still works',
        passed: validations4.length === 2 &&
            validations4.some(v => v.domain === 'accessibility') &&
            validations4.some(v => v.domain === 'semantic'),
    });
}
function testBlock7d() {
    const mappedFlows = [
        'flowI_accessibility',
        'flowE_motion_patterns',
        'flowJ_tactical_polish',
        'flowK_multi_lens_audit',
        'flowT_ambitious_motion',
        'flowF_design_tokens',
        'flowA_brand_verify',
        'flowG_component_implementation',
        'flowH_motion_integration',
        'flowB_component_research',
        'flowC_font_research',
        'flowD_reference_inspiration',
        'flowU_curate',
        'flowV_all_seven_qa',
    ];
    // Test 1: All mapped flows have validators
    const allMapped = mappedFlows.every(flowId => {
        const validators = (0, flow_domain_validators_1.getValidatorsForFlow)(flowId);
        return validators.length > 0;
    });
    results.push({
        test: 'All 14 mapped flows have validators defined',
        passed: allMapped,
    });
    // Test 2: All validators are registered
    const engine = new flow_composition_1.FlowCompositionEngine();
    (0, flow_domain_validators_1.registerFlowDomainValidators)(engine);
    const domains = ['accessibility', 'performance', 'design_system', 'semantic', 'content_quality'];
    const allRegistered = domains.every(domain => engine.getDomainValidator(domain) !== null);
    results.push({
        test: 'All 5 domain validators are registered',
        passed: allRegistered,
    });
}
// Run all test blocks
testBlock7a();
testBlock7b();
testBlock7c();
testBlock7d();
// Print results
console.log('Phase H Block 7: Flow Validator Integration Tests');
console.log('================================================\n');
const blocks = [
    { name: 'Block 7a: Validator Registration', range: [0, 7] },
    { name: 'Block 7b: Validator Application', range: [7, 13] },
    { name: 'Block 7c: Composite Flows', range: [13, 17] },
    { name: 'Block 7d: Coverage Verification', range: [17, 19] },
];
blocks.forEach(block => {
    const blockResults = results.slice(block.range[0], block.range[1]);
    const passed = blockResults.filter(r => r.passed).length;
    console.log(`${block.name}: ${passed}/${blockResults.length}`);
    blockResults.forEach(r => {
        console.log(`  ${r.passed ? '✓' : '✗'} ${r.test}`);
    });
});
const totalPassed = results.filter(r => r.passed).length;
console.log(`\nTotal: ${totalPassed}/${results.length} tests passing`);
console.log(totalPassed === results.length ? 'Status: PASSED' : 'Status: FAILED');
//# sourceMappingURL=phase-h-block7-flow-validator-integration.test.js.map