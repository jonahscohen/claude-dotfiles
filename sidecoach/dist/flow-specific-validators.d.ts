import { FlowExecutionResult, FlowExecutionContext } from './flow-handler';
export interface FlowValidationRule {
    name: string;
    description: string;
    check: (context: FlowExecutionContext, result: FlowExecutionResult) => boolean;
    severity: 'error' | 'warning' | 'info';
}
export interface FlowValidatorConfig {
    flowId: string;
    rules: FlowValidationRule[];
}
export declare class FlowSpecificValidator {
    static getValidatorConfig(flowId: string): FlowValidatorConfig | undefined;
    static validateFlow(flowId: string, context: FlowExecutionContext, result: FlowExecutionResult): {
        passed: number;
        failed: number;
        warnings: string[];
    };
    static getAllValidators(): FlowValidatorConfig[];
    static validateAll(flowId: string, context: FlowExecutionContext, result: FlowExecutionResult): Record<string, {
        passed: number;
        failed: number;
        warnings: string[];
    }>;
}
export declare function getFlowValidatorConfig(flowId: string): FlowValidatorConfig | undefined;
//# sourceMappingURL=flow-specific-validators.d.ts.map