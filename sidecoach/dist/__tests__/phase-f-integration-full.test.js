"use strict";
/**
 * Phase F Integration Test - Full Suite with Fixtures
 * Tests all flows with proper project context and PRODUCT.md fixture
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const flow_handler_brand_verify_1 = require("../flow-handler-brand-verify");
const flow_handler_component_research_1 = require("../flow-handler-component-research");
const flow_handler_font_research_1 = require("../flow-handler-font-research");
const flow_handler_design_references_1 = require("../flow-handler-design-references");
const flow_handler_motion_patterns_1 = require("../flow-handler-motion-patterns");
const flow_handler_design_tokens_1 = require("../flow-handler-design-tokens");
const flow_handler_component_implementation_1 = require("../flow-handler-component-implementation");
const flow_handler_motion_integration_1 = require("../flow-handler-motion-integration");
const flow_handler_accessibility_1 = require("../flow-handler-accessibility");
const testFixturePath = path.join(__dirname, 'fixtures');
const productMdPath = path.join(testFixturePath, 'PRODUCT.md');
function setupTestEnvironment() {
    // Ensure fixture directory exists
    if (!fs.existsSync(testFixturePath)) {
        fs.mkdirSync(testFixturePath, { recursive: true });
    }
    // Ensure PRODUCT.md fixture exists
    if (!fs.existsSync(productMdPath)) {
        fs.writeFileSync(productMdPath, `# Project Strategy

## Register
Product design

## Primary Users
Product designers and developers

## Brand Personality
Modern and focused

## Anti-References
- Skeuomorphism
- Over-animation

## Strategic Principles
- Clarity > Decoration
- Accessibility first
`);
    }
}
const testContext = {
    projectPath: testFixturePath,
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
        const result = await flowHandler.execute(testContext);
        const executionTime = Date.now() - startTime;
        // Verify result structure
        if (!result.flowId || !result.status) {
            return {
                flow: flowId,
                status: 'fail',
                error: 'Missing flowId or status in result',
                executionTime,
            };
        }
        // Count domain validations in guidance
        const domainsValidated = result.guidance ? result.guidance.filter((line) => /domain:.*rules passing/.test(line)).length : 0;
        return {
            flow: flowId,
            status: 'pass',
            executionTime,
            domainsValidated,
        };
    }
    catch (err) {
        return {
            flow: flowId,
            status: 'fail',
            error: String(err).substring(0, 60),
            executionTime: Date.now() - startTime,
        };
    }
}
async function runFullIntegration() {
    console.log('\n================================================================================');
    console.log('Phase F Integration Test - Full Suite with Fixtures');
    console.log('================================================================================\n');
    setupTestEnvironment();
    console.log(`Test fixture path: ${testFixturePath}`);
    console.log(`PRODUCT.md exists: ${fs.existsSync(productMdPath)}\n`);
    const flows = [
        { handler: new flow_handler_brand_verify_1.FlowABrandVerifyHandler(), id: 'flowA_brand_verify' },
        { handler: new flow_handler_component_research_1.FlowBComponentResearchHandler(), id: 'flowB_component_research' },
        { handler: new flow_handler_font_research_1.FlowCFontResearchHandler(), id: 'flowC_font_research' },
        { handler: new flow_handler_design_references_1.FlowDReferenceSearchHandler(), id: 'flowD_reference_search' },
        { handler: new flow_handler_motion_patterns_1.FlowEMotionPatternsHandler(), id: 'flowE_motion_patterns' },
        { handler: new flow_handler_design_tokens_1.FlowFDesignTokensHandler(), id: 'flowF_design_tokens' },
        { handler: new flow_handler_component_implementation_1.FlowGComponentImplementationHandler(), id: 'flowG_component_implementation' },
        { handler: new flow_handler_motion_integration_1.FlowHMotionIntegrationHandler(), id: 'flowH_motion_integration' },
        { handler: new flow_handler_accessibility_1.FlowIAccessibilityHandler(), id: 'flowI_accessibility' },
    ];
    const results = [];
    let passed = 0;
    let failed = 0;
    let totalDomains = 0;
    for (const flow of flows) {
        process.stdout.write(`${flow.id.padEnd(35)} `);
        const result = await runFlowTest(flow.handler, flow.id);
        results.push(result);
        if (result.status === 'pass') {
            console.log(`✓ PASS (${result.executionTime}ms)`);
            if (result.domainsValidated) {
                console.log(`  Domain validations: ${result.domainsValidated}`);
                totalDomains += result.domainsValidated;
            }
            passed++;
        }
        else {
            console.log(`✗ FAIL`);
            console.log(`  ${result.error}`);
            failed++;
        }
    }
    console.log('\n================================================================================');
    console.log(`Results: ${passed} passed, ${failed} failed out of ${flows.length} tests`);
    console.log(`Success rate: ${((passed / flows.length) * 100).toFixed(1)}%`);
    console.log(`Total domain validations detected: ${totalDomains}`);
    console.log('================================================================================\n');
    if (failed === 0) {
        console.log('✓ Phase F Full Integration: ALL TESTS PASSED');
        console.log('Production integration ready for Phase G deployment.\n');
        process.exit(0);
    }
    else {
        console.log(`✗ Phase F Full Integration: ${failed} test(s) failed`);
        process.exit(1);
    }
}
runFullIntegration().catch((err) => {
    console.error('Test suite error:', err);
    process.exit(1);
});
//# sourceMappingURL=phase-f-integration-full.test.js.map