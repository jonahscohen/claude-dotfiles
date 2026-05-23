"use strict";
/**
 * Phase H Block 2 Integration Test - Conditional Flow Execution
 * Tests conditional logic, branching, and guard conditions
 */
Object.defineProperty(exports, "__esModule", { value: true });
const flow_composition_1 = require("../flow-composition");
const results = [];
// Test 1: Condition evaluation
function testConditionEvaluation() {
    const engine = new flow_composition_1.FlowCompositionEngine();
    const successCondition = engine.evaluateCondition({
        flowId: 'flowA_brand_verify',
        condition: flow_composition_1.FlowCompositionEngine.requirePreviousStatus('success')
    }, {
        previousResult: {
            flowId: 'flowA_brand_verify',
            flowName: 'Test',
            status: 'success',
            message: 'Success',
            guidance: [],
            checklist: [],
        },
        executionContext: {},
        executedFlows: new Map(),
    });
    results.push({
        test: 'Condition correctly evaluates previous status',
        passed: successCondition === true,
        message: 'Success condition evaluated correctly',
    });
}
// Test 2: Guard condition prevents execution
function testGuardConditionPrevention() {
    const engine = new flow_composition_1.FlowCompositionEngine();
    engine.resetExecutionState();
    const context = {
        previousResult: {
            flowId: 'flowB_component_research',
            flowName: 'Test',
            status: 'error',
            message: 'Failed',
            guidance: [],
            checklist: [],
        },
        executionContext: {},
        executedFlows: new Map(),
    };
    const shouldSkip = engine.shouldSkipStep({
        flowId: 'flowB_component_research',
        condition: flow_composition_1.FlowCompositionEngine.requirePreviousStatus('success'),
    }, context);
    results.push({
        test: 'Guard condition correctly blocks execution on failure',
        passed: shouldSkip === true,
        message: 'Step correctly skipped due to guard condition',
    });
}
// Test 3: Branching flows based on success
function testBranchingOnSuccess() {
    const engine = new flow_composition_1.FlowCompositionEngine();
    const step = {
        flowId: 'flowA_brand_verify',
        branches: {
            onSuccess: ['flowF_design_tokens', 'flowG_component_implementation'],
            onError: [],
            onSkipped: [],
        },
    };
    const successResult = {
        flowId: 'flowA_brand_verify',
        flowName: 'Brand Verify',
        status: 'success',
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
    const engine = new flow_composition_1.FlowCompositionEngine();
    const step = {
        flowId: 'flowB_component_research',
        branches: {
            onSuccess: [],
            onError: ['flowD_reference_inspiration'],
            onSkipped: [],
        },
    };
    const errorResult = {
        flowId: 'flowB_component_research',
        flowName: 'Component Research',
        status: 'error',
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
    const engine = new flow_composition_1.FlowCompositionEngine();
    engine.resetExecutionState();
    const result1 = {
        flowId: 'flowA_brand_verify',
        flowName: 'Brand Verify',
        status: 'success',
        message: 'Success',
        guidance: [],
        checklist: [],
    };
    const result2 = {
        flowId: 'flowB_component_research',
        flowName: 'Component Research',
        status: 'success',
        message: 'Success',
        guidance: [],
        checklist: [],
    };
    engine.recordExecutedFlow('flowA_brand_verify', result1);
    engine.recordExecutedFlow('flowB_component_research', result2);
    const executed = engine.getExecutedFlows();
    results.push({
        test: 'Executed flows are tracked for condition context',
        passed: executed.size === 2 && executed.has('flowA_brand_verify'),
        message: `${executed.size} flows tracked`,
    });
}
// Test 6: Require flow success condition
function testRequireFlowSuccessCondition() {
    const engine = new flow_composition_1.FlowCompositionEngine();
    engine.resetExecutionState();
    const result = {
        flowId: 'flowA_brand_verify',
        flowName: 'Brand Verify',
        status: 'success',
        message: 'Success',
        guidance: [],
        checklist: [],
    };
    engine.recordExecutedFlow('flowA_brand_verify', result);
    const context = {
        executionContext: {},
        executedFlows: engine.getExecutedFlows(),
    };
    const condition = flow_composition_1.FlowCompositionEngine.requireFlowSuccess('flowA_brand_verify');
    const passes = condition(context);
    results.push({
        test: 'requireFlowSuccess condition correctly identifies successful flows',
        passed: passes === true,
        message: 'Condition correctly detected success',
    });
}
// Test 7: Guidance content condition
function testGuidanceContentCondition() {
    const context = {
        previousResult: {
            flowId: 'flowC_font_research',
            flowName: 'Test',
            status: 'success',
            message: 'Success',
            guidance: ['Design system is consistent', 'Colors are accessible'],
            checklist: [],
        },
        executionContext: {},
        executedFlows: new Map(),
    };
    const condition = flow_composition_1.FlowCompositionEngine.requireGuidanceContains('Design system');
    const passes = condition(context);
    results.push({
        test: 'Guidance content condition matches expected patterns',
        passed: passes === true,
        message: 'Guidance pattern correctly detected',
    });
}
// Test 8: Composite conditions (anyOf)
function testCompositeAnyOfCondition() {
    const condition = flow_composition_1.FlowCompositionEngine.anyOf(flow_composition_1.FlowCompositionEngine.requirePreviousStatus('success'), flow_composition_1.FlowCompositionEngine.requirePreviousStatus('error'));
    const contextSuccess = {
        previousResult: {
            flowId: 'flowD_reference_inspiration',
            flowName: 'Test',
            status: 'success',
            message: 'Success',
            guidance: [],
            checklist: [],
        },
        executionContext: {},
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
    const condition = flow_composition_1.FlowCompositionEngine.allOf(flow_composition_1.FlowCompositionEngine.requirePreviousStatus('success'), flow_composition_1.FlowCompositionEngine.requireGuidanceContains('test'));
    const contextMatching = {
        previousResult: {
            flowId: 'flowE_motion_patterns',
            flowName: 'Test',
            status: 'success',
            message: 'Success',
            guidance: ['test guidance'],
            checklist: [],
        },
        executionContext: {},
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
    const engine = new flow_composition_1.FlowCompositionEngine();
    const step = {
        flowId: 'flowC_font_research',
    };
    const result = {
        flowId: 'flowC_font_research',
        flowName: 'Font Research',
        status: 'success',
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
//# sourceMappingURL=phase-h-block2-conditional.test.js.map