import { FlowId } from './types';
export interface DomainFlowMapping {
    domain: string;
    description: string;
    flowIds: FlowId[];
    validationPoints: string[];
    severity: 'critical' | 'high' | 'medium';
}
export interface FlowDomainRequirement {
    flowId: FlowId;
    flowName: string;
    domains: string[];
    primaryDomains: string[];
    optionalDomains: string[];
}
export declare const DOMAIN_FLOW_MAP: DomainFlowMapping[];
export declare const FLOW_DOMAIN_MATRIX: FlowDomainRequirement[];
export declare function getDomainsForFlow(flowId: FlowId): string[];
export declare function getPrimaryDomainsForFlow(flowId: FlowId): string[];
export declare function getFlowsForDomain(domain: string): FlowId[];
export declare function getValidationPointsForDomain(domain: string): string[];
//# sourceMappingURL=flow-domain-mapping.d.ts.map