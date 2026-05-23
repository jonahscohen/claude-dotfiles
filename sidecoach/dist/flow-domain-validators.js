"use strict";
/**
 * Flow Domain Validators
 * Defines domain validators for specific flows to ensure quality across different dimensions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPOSITE_FLOW_VALIDATIONS = void 0;
exports.createAccessibilityValidator = createAccessibilityValidator;
exports.createPerformanceValidator = createPerformanceValidator;
exports.createDesignSystemValidator = createDesignSystemValidator;
exports.createSemanticValidator = createSemanticValidator;
exports.createContentQualityValidator = createContentQualityValidator;
exports.registerFlowDomainValidators = registerFlowDomainValidators;
exports.getValidatorsForFlow = getValidatorsForFlow;
const flow_composition_1 = require("./flow-composition");
/**
 * Create accessibility validators for WCAG 2.1 AA compliance flows
 */
function createAccessibilityValidator() {
    const rules = [
        {
            name: 'has_wcag_guidance',
            description: 'Result includes WCAG 2.1 AA compliance guidance',
            validate: (result) => {
                return result.guidance?.some(g => g.toLowerCase().includes('wcag') || g.toLowerCase().includes('accessibility')) ?? false;
            },
        },
        {
            name: 'has_testing_plan',
            description: 'Result includes screen reader or accessibility testing plan',
            validate: (result) => {
                return result.guidance?.some(g => g.toLowerCase().includes('screen reader') ||
                    g.toLowerCase().includes('voiceover') ||
                    g.toLowerCase().includes('nvda') ||
                    g.toLowerCase().includes('keyboard')) ?? false;
            },
        },
        {
            name: 'has_checklist',
            description: 'Result includes accessibility checklist items',
            validate: (result) => {
                return (result.checklist?.length ?? 0) > 0;
            },
        },
    ];
    return flow_composition_1.FlowCompositionEngine.createDomainValidator('accessibility', rules);
}
/**
 * Create performance validators for motion and polish flows
 */
function createPerformanceValidator() {
    const rules = [
        {
            name: 'has_performance_metrics',
            description: 'Result includes performance metrics or guidelines',
            validate: (result) => {
                return result.guidance?.some(g => g.toLowerCase().includes('performance') ||
                    g.toLowerCase().includes('fps') ||
                    g.toLowerCase().includes('animation') ||
                    g.toLowerCase().includes('motion')) ?? false;
            },
        },
        {
            name: 'has_optimization_guidance',
            description: 'Result includes optimization or smoothness guidance',
            validate: (result) => {
                return result.guidance?.some(g => g.toLowerCase().includes('optimize') ||
                    g.toLowerCase().includes('smooth') ||
                    g.toLowerCase().includes('reduced-motion') ||
                    g.toLowerCase().includes('performance budget')) ?? false;
            },
        },
    ];
    return flow_composition_1.FlowCompositionEngine.createDomainValidator('performance', rules);
}
/**
 * Create design system compliance validators
 */
function createDesignSystemValidator() {
    const rules = [
        {
            name: 'uses_design_tokens',
            description: 'Result references design tokens or design system',
            validate: (result) => {
                return result.guidance?.some(g => g.toLowerCase().includes('token') ||
                    g.toLowerCase().includes('design system') ||
                    g.toLowerCase().includes('design.md') ||
                    g.toLowerCase().includes('typography')) ?? false;
            },
        },
        {
            name: 'has_design_rationale',
            description: 'Result includes design decision rationale',
            validate: (result) => {
                return result.guidance?.some(g => g.toLowerCase().includes('why') ||
                    g.toLowerCase().includes('rationale') ||
                    g.toLowerCase().includes('principle') ||
                    g.toLowerCase().includes('constraint')) ?? false;
            },
        },
        {
            name: 'validates_coverage',
            description: 'Result validates design system coverage',
            validate: (result) => {
                return (result.artifacts?.length ?? 0) > 0 || (result.checklist?.length ?? 0) > 0;
            },
        },
    ];
    return flow_composition_1.FlowCompositionEngine.createDomainValidator('design_system', rules);
}
/**
 * Create semantic correctness validators for implementation flows
 */
function createSemanticValidator() {
    const rules = [
        {
            name: 'has_semantic_guidance',
            description: 'Result includes semantic HTML or structure guidance',
            validate: (result) => {
                return result.guidance?.some(g => g.toLowerCase().includes('semantic') ||
                    g.toLowerCase().includes('html') ||
                    g.toLowerCase().includes('aria') ||
                    g.toLowerCase().includes('structure')) ?? false;
            },
        },
        {
            name: 'has_implementation_details',
            description: 'Result includes specific implementation details or code patterns',
            validate: (result) => {
                return result.guidance?.some(g => g.toLowerCase().includes('implement') ||
                    g.toLowerCase().includes('code') ||
                    g.toLowerCase().includes('pattern') ||
                    g.toLowerCase().includes('component')) ?? false;
            },
        },
        {
            name: 'has_validation_criteria',
            description: 'Result includes validation or success criteria',
            validate: (result) => {
                return (result.checklist?.length ?? 0) > 0 || (result.guidance?.some(g => g.toLowerCase().includes('verify') ||
                    g.toLowerCase().includes('validate') ||
                    g.toLowerCase().includes('test')) ?? false);
            },
        },
    ];
    return flow_composition_1.FlowCompositionEngine.createDomainValidator('semantic', rules);
}
/**
 * Create content quality validators for reference and research flows
 */
function createContentQualityValidator() {
    const rules = [
        {
            name: 'has_meaningful_content',
            description: 'Result includes meaningful content or references',
            validate: (result) => {
                return (result.guidance?.length ?? 0) > 0 || (result.artifacts?.length ?? 0) > 0;
            },
        },
        {
            name: 'avoids_generic_content',
            description: 'Result avoids overly generic or AI-slop content',
            validate: (result) => {
                const allText = [
                    ...(result.guidance ?? []),
                    ...(result.checklist?.map(c => typeof c === 'string' ? c : c.label) ?? []),
                ].join(' ').toLowerCase();
                // Check for common AI-slop patterns
                const genericPatterns = [
                    'leverage',
                    'synergy',
                    'paradigm shift',
                    'cutting edge',
                    'game changer',
                    'revolutionary',
                ];
                const hasGenerics = genericPatterns.some(pattern => allText.includes(pattern));
                return !hasGenerics;
            },
        },
    ];
    return flow_composition_1.FlowCompositionEngine.createDomainValidator('content_quality', rules);
}
/**
 * Register all domain validators into an engine
 */
function registerFlowDomainValidators(engine) {
    engine.registerDomainValidator(createAccessibilityValidator());
    engine.registerDomainValidator(createPerformanceValidator());
    engine.registerDomainValidator(createDesignSystemValidator());
    engine.registerDomainValidator(createSemanticValidator());
    engine.registerDomainValidator(createContentQualityValidator());
}
/**
 * Get domain validators for a specific flow
 */
function getValidatorsForFlow(flowId) {
    const flowValidatorMap = {
        // Accessibility validation
        flowI_accessibility: ['accessibility'],
        // Performance validation (motion and polish flows)
        flowE_motion_patterns: ['performance', 'content_quality'],
        flowJ_tactical_polish: ['performance'],
        flowK_multi_lens_audit: ['performance'],
        flowT_ambitious_motion: ['performance'],
        // Design system validation
        flowF_design_tokens: ['design_system'],
        flowA_brand_verify: ['design_system'],
        // Semantic/implementation validation
        flowG_component_implementation: ['semantic', 'design_system'],
        flowH_motion_integration: ['semantic', 'performance'],
        // Content quality validation
        flowB_component_research: ['content_quality'],
        flowC_font_research: ['content_quality'],
        flowD_reference_inspiration: ['content_quality'],
        // Multi-dimensional validation
        flowU_curate: ['content_quality', 'design_system'],
        flowV_all_seven_qa: ['accessibility', 'performance', 'design_system', 'semantic'],
    };
    return flowValidatorMap[flowId] ?? [];
}
/**
 * Configuration for composite flows with domain validation
 */
exports.COMPOSITE_FLOW_VALIDATIONS = {
    // Accessibility-focused composite flow
    accessibility_workflow: {
        domains: ['accessibility', 'semantic'],
        failOnError: false, // Log but continue
    },
    // Performance-focused composite flow
    performance_workflow: {
        domains: ['performance', 'content_quality'],
        failOnError: false,
    },
    // Design system compliance flow
    design_system_workflow: {
        domains: ['design_system', 'content_quality'],
        failOnError: false,
    },
    // Complete QA flow
    complete_qa_workflow: {
        domains: ['accessibility', 'performance', 'design_system', 'semantic', 'content_quality'],
        failOnError: false,
    },
};
//# sourceMappingURL=flow-domain-validators.js.map