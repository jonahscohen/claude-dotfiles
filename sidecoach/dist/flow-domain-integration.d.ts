import { FlowId } from './types';
import { FlowExecutionContext, FlowExecutionResult } from './flow-handler';
export interface DomainIntegrationContext {
    flowId: FlowId;
    domains: string[];
    domainRules: Record<string, string[]>;
    validationCheckpoints: string[];
    register: 'brand' | 'product' | null;
}
export interface DomainValidationResult {
    domain: string;
    ruleCount: number;
    rules: string[];
    checkpointsApplied: string[];
}
export declare class FlowDomainIntegrator {
    private flowId;
    private context;
    constructor(flowId: FlowId, context: Partial<FlowExecutionContext>);
    getDomainIntegrationContext(): DomainIntegrationContext;
    validateDomains(): DomainValidationResult[];
    applyDomainRulesToResult(result: FlowExecutionResult): FlowExecutionResult;
    enrichContextWithDomains(): Partial<FlowExecutionContext>;
}
export declare function createDomainIntegrator(flowId: FlowId, context: Partial<FlowExecutionContext>): FlowDomainIntegrator;
export declare function shouldApplyDomain(flowId: FlowId, domain: string, isPrimary?: boolean): boolean;
//# sourceMappingURL=flow-domain-integration.d.ts.map