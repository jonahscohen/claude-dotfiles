/**
 * Flow Prerequisites System
 * Defines and validates flow execution prerequisites and dependencies
 */
import { FlowId } from './types';
import { FlowHistoryEntry } from './flow-history';
export interface FlowPrerequisite {
    flowId: FlowId;
    required: boolean;
    reasonIfFailed?: string;
}
export interface FlowDependency {
    flowId: FlowId;
    prerequisites: FlowPrerequisite[];
    contextRequirements?: string[];
    minSuccessfulPrerequisites?: number;
}
export declare class FlowPrerequisiteValidator {
    static getDependencies(flowId: FlowId): FlowDependency | null;
    static canExecute(flowId: FlowId, flowHistory: FlowHistoryEntry[]): {
        canExecute: boolean;
        reason?: string;
    };
    static validateContextRequirements(flowId: FlowId, context: Record<string, any>): {
        valid: boolean;
        missing?: string[];
    };
    static getPrerequisiteChain(flowId: FlowId): FlowId[];
}
//# sourceMappingURL=flow-prerequisites.d.ts.map