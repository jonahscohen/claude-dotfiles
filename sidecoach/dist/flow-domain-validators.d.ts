/**
 * Flow Domain Validators
 * Defines domain validators for specific flows to ensure quality across different dimensions
 */
import { FlowCompositionEngine, DomainValidator } from './flow-composition';
/**
 * Create accessibility validators for WCAG 2.1 AA compliance flows
 */
export declare function createAccessibilityValidator(): DomainValidator;
/**
 * Create performance validators for motion and polish flows
 */
export declare function createPerformanceValidator(): DomainValidator;
/**
 * Create design system compliance validators
 */
export declare function createDesignSystemValidator(): DomainValidator;
/**
 * Create semantic correctness validators for implementation flows
 */
export declare function createSemanticValidator(): DomainValidator;
/**
 * Create content quality validators for reference and research flows
 */
export declare function createContentQualityValidator(): DomainValidator;
/**
 * Register all domain validators into an engine
 */
export declare function registerFlowDomainValidators(engine: FlowCompositionEngine): void;
/**
 * Get domain validators for a specific flow
 */
export declare function getValidatorsForFlow(flowId: string): string[];
/**
 * Configuration for composite flows with domain validation
 */
export declare const COMPOSITE_FLOW_VALIDATIONS: {
    accessibility_workflow: {
        domains: string[];
        failOnError: boolean;
    };
    performance_workflow: {
        domains: string[];
        failOnError: boolean;
    };
    design_system_workflow: {
        domains: string[];
        failOnError: boolean;
    };
    complete_qa_workflow: {
        domains: string[];
        failOnError: boolean;
    };
};
//# sourceMappingURL=flow-domain-validators.d.ts.map