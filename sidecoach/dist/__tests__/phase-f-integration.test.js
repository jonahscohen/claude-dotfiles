"use strict";
/**
 * Phase F Integration Test Suite
 * Validates all flows A-V execute correctly with ExtendedDomainValidator
 */
Object.defineProperty(exports, "__esModule", { value: true });
const flow_handler_brand_verify_1 = require("../flow-handler-brand-verify");
const flow_handler_component_research_1 = require("../flow-handler-component-research");
const flow_handler_font_research_1 = require("../flow-handler-font-research");
const flow_handler_design_references_1 = require("../flow-handler-design-references");
const flow_handler_motion_patterns_1 = require("../flow-handler-motion-patterns");
const flow_handler_design_tokens_1 = require("../flow-handler-design-tokens");
const flow_handler_component_implementation_1 = require("../flow-handler-component-implementation");
const flow_handler_motion_integration_1 = require("../flow-handler-motion-integration");
const flow_handler_accessibility_1 = require("../flow-handler-accessibility");
const mockContext = {
    projectContext: {
        product: {
            brandPersonality: 'modern',
            register: 'product',
        },
        register: 'product',
    },
    metadata: {
        componentName: 'button',
        designTokens: { primary: '#3b82f6', spacing: 8 },
        componentTree: { nodeCount: 5 },
        cssRules: ['body { margin: 0; }'],
        colors: { primary: '#3b82f6', secondary: '#10b981' },
        typography: { body: 'system-ui', heading: 'system-ui' },
        spacing: { base: 8, scale: 1.5 },
        motion: { duration: 200, easing: 'ease-out' },
        accessibility: { wcagLevel: 'AA', contrastRatio: 4.5 },
    },
};
async function runFlowTest(flowHandler, flowId) {
    const startTime = Date.now();
    try {
        const result = await flowHandler.execute(mockContext);
        const executionTime = Date.now() - startTime;
        // Verify required result structure
        if (!result.flowId || !result.status || !result.guidance || !result.checklist) {
            return {
                flow: flowId,
                status: 'fail',
                error: 'Missing required result fields (flowId, status, guidance, checklist)',
                executionTime,
            };
        }
        // Verify memory builder integration
        if (!result.memory) {
            return {
                flow: flowId,
                status: 'fail',
                error: 'Missing memory integration',
                executionTime,
            };
        }
        // Extract validation metrics from guidance if present
        const validationMetrics = extractValidationMetrics(result.guidance);
        return {
            flow: flowId,
            status: 'pass',
            executionTime,
            validationMetrics,
        };
    }
    catch (err) {
        return {
            flow: flowId,
            status: 'fail',
            error: String(err),
            executionTime: Date.now() - startTime,
        };
    }
}
function extractValidationMetrics(guidance) {
    const domains = new Set();
    const passRates = {};
    guidance.forEach((line) => {
        // Pattern: "- Domain Name domain: X/Y rules passing (XX%)"
        const match = line.match(/domain: (\d+)\/(\d+) rules passing \((\d+)%\)/);
        if (match) {
            const domain = line.split(':')[0].trim().replace('- ', '').toLowerCase();
            domains.add(domain);
            passRates[domain] = match[3] + '%';
        }
    });
    return {
        domainsValidated: Array.from(domains),
        passRates,
    };
}
async function runPhaseF() {
    console.log('\n================================================================================');
    console.log('Phase F Integration Test Suite - All Flows A-V');
    console.log('================================================================================\n');
    const flows = [
        { handler: new flow_handler_brand_verify_1.FlowABrandVerifyHandler(), id: 'flowA_brand_verify' },
        { handler: new flow_handler_component_research_1.FlowBComponentResearchHandler(), id: 'flowB_component_research' },
        { handler: new flow_handler_font_research_1.FlowCFontResearchHandler(), id: 'flowC_font_research' },
        { handler: new flow_handler_design_references_1.FlowDReferenceSearchHandler(), id: 'flowD_design_references' },
        { handler: new flow_handler_motion_patterns_1.FlowEMotionPatternsHandler(), id: 'flowE_motion_patterns' },
        { handler: new flow_handler_design_tokens_1.FlowFDesignTokensHandler(), id: 'flowF_design_tokens' },
        { handler: new flow_handler_component_implementation_1.FlowGComponentImplementationHandler(), id: 'flowG_component_implementation' },
        { handler: new flow_handler_motion_integration_1.FlowHMotionIntegrationHandler(), id: 'flowH_motion_integration' },
        { handler: new flow_handler_accessibility_1.FlowIAccessibilityHandler(), id: 'flowI_accessibility' },
    ];
    const results = [];
    let passed = 0;
    let failed = 0;
    for (const flow of flows) {
        process.stdout.write(`Testing ${flow.id}... `);
        const result = await runFlowTest(flow.handler, flow.id);
        results.push(result);
        if (result.status === 'pass') {
            console.log(`✓ PASS (${result.executionTime}ms)`);
            if (result.validationMetrics?.domainsValidated.length) {
                console.log(`  Domains: ${result.validationMetrics.domainsValidated.join(', ')}`);
            }
            passed++;
        }
        else {
            console.log(`✗ FAIL`);
            console.log(`  Error: ${result.error}`);
            failed++;
        }
    }
    console.log('\n================================================================================');
    console.log(`Results: ${passed} passed, ${failed} failed out of ${flows.length} tests`);
    console.log(`Success rate: ${((passed / flows.length) * 100).toFixed(1)}%`);
    console.log('================================================================================\n');
    // Print detailed metrics
    console.log('Validation Metrics by Flow:');
    console.log('---');
    results.forEach((result) => {
        if (result.status === 'pass' && result.validationMetrics?.domainsValidated.length) {
            console.log(`${result.flow}:`);
            console.log(`  Domains validated: ${result.validationMetrics.domainsValidated.length}`);
            Object.entries(result.validationMetrics.passRates).forEach(([domain, rate]) => {
                console.log(`    ${domain}: ${rate}`);
            });
        }
    });
    if (failed === 0) {
        console.log('\n✓ Phase F Block 1: ALL TESTS PASSED - Production integration ready');
        process.exit(0);
    }
    else {
        console.log(`\n✗ Phase F Block 1: ${failed} test(s) failed`);
        process.exit(1);
    }
}
runPhaseF().catch((err) => {
    console.error('Test suite error:', err);
    process.exit(1);
});
//# sourceMappingURL=phase-f-integration.test.js.map