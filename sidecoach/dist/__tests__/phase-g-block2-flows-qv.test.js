"use strict";
/**
 * Phase G Block 2 Integration Test - Flows Q-V
 * Tests new specialized flows with extended domain validation
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
const flow_handler_migration_1 = require("../flow-handler-migration");
const flow_handler_layout_optimization_1 = require("../flow-handler-layout-optimization");
const flow_handler_typography_excellence_1 = require("../flow-handler-typography-excellence");
const flow_handler_ambitious_motion_1 = require("../flow-handler-ambitious-motion");
const flow_handler_curate_1 = require("../flow-handler-curate");
const flow_handler_all_seven_qa_1 = require("../flow-handler-all-seven-qa");
const testFixturePath = path.join(__dirname, 'fixtures');
const productMdPath = path.join(testFixturePath, 'PRODUCT.md');
function setupTestEnvironment() {
    if (!fs.existsSync(testFixturePath)) {
        fs.mkdirSync(testFixturePath, { recursive: true });
    }
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
    utterance: 'test flow execution',
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
        spacing: { baseUnit: 8, scale: [4, 8, 12, 16, 24, 32, 48, 64], containerMaxWidth: 1200, gutter: 24 },
        motion: { duration: 200, easing: 'ease-out' },
        accessibility: { wcagLevel: 'AA', contrastRatio: 4.5 },
    },
};
async function runFlowTest(flowHandler, flowId) {
    const startTime = Date.now();
    console.log(`DEBUG ${flowId}: handler class = ${flowHandler.constructor.name}`);
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
        // Verify guidance and checklist
        if (!result.guidance || !Array.isArray(result.guidance)) {
            console.error(`DEBUG ${flowId}: result.guidance=${result.guidance}, typeof=${typeof result.guidance}`);
            return {
                flow: flowId,
                status: 'fail',
                error: 'Missing guidance array in result',
                executionTime,
            };
        }
        if (!result.checklist || !Array.isArray(result.checklist)) {
            return {
                flow: flowId,
                status: 'fail',
                error: 'Missing checklist array in result',
                executionTime,
            };
        }
        return {
            flow: flowId,
            status: 'pass',
            executionTime,
        };
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`DEBUG ${flowId} exception: ${errorMsg}`);
        return {
            flow: flowId,
            status: 'fail',
            error: errorMsg,
            executionTime: Date.now() - startTime,
        };
    }
}
async function runTests() {
    setupTestEnvironment();
    const testSuite = [
        { handler: new flow_handler_migration_1.FlowQMigrationHandler(), id: 'flowQ_migration' },
        { handler: new flow_handler_layout_optimization_1.FlowRLayoutOptimizationHandler(), id: 'flowR_layout_optimization' },
        { handler: new flow_handler_typography_excellence_1.FlowSTypographyExcellenceHandler(), id: 'flowS_typography_excellence' },
        { handler: new flow_handler_ambitious_motion_1.FlowTAmbitiousMotionHandler(), id: 'flowT_ambitious_motion' },
        { handler: new flow_handler_curate_1.FlowUCurateHandler(), id: 'flowU_curate' },
        { handler: new flow_handler_all_seven_qa_1.FlowVAllSevenQAHandler(), id: 'flowV_all_seven_qa' },
    ];
    console.log('Phase G Block 2 Integration Test Suite - Flows Q-V');
    console.log('='.repeat(50));
    const results = [];
    for (const { handler, id } of testSuite) {
        const result = await runFlowTest(handler, id);
        results.push(result);
        const statusSymbol = result.status === 'pass' ? '✓' : '✗';
        console.log(`${statusSymbol} ${result.flow} (${result.executionTime}ms)`);
        if (result.error) {
            console.log(`  Error: ${result.error}`);
        }
    }
    console.log('='.repeat(50));
    const passed = results.filter((r) => r.status === 'pass').length;
    const failed = results.filter((r) => r.status === 'fail').length;
    console.log(`Results: ${passed} passed, ${failed} failed`);
    if (failed > 0) {
        process.exit(1);
    }
}
runTests().catch((error) => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
//# sourceMappingURL=phase-g-block2-flows-qv.test.js.map