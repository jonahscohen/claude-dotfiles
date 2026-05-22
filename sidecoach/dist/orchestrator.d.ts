import { FlowExecutionContext, FlowExecutionResult } from './flow-handler';
import { FlowId } from './types';
import { FlowHistory } from './flow-history';
export type DesignPhase = 'research' | 'execution' | 'polish' | 'qa';
export interface FlowDependency {
    flowId: FlowId;
    prerequisiteFlows: FlowId[];
    prerequisiteArtifacts: string[];
    nextFlowsIfSuccess: FlowId[];
    nextFlowsIfIncomplete: FlowId[];
}
export interface FlowChain {
    phase: DesignPhase;
    flows: FlowId[];
    description: string;
}
export declare class SidecoachOrchestrator {
    private flowDependencies;
    private flowChains;
    private history;
    constructor(history: FlowHistory);
    private initializeDependencies;
    private initializeFlowChains;
    detectPhase(context: FlowExecutionContext): DesignPhase;
    recommendFlowSequence(phase: DesignPhase): FlowId[];
    validatePrerequisites(flowId: FlowId): {
        valid: boolean;
        missingArtifacts: string[];
        message: string;
    };
    getNextRecommendedFlow(currentFlowId: FlowId, currentResult: FlowExecutionResult): FlowId | undefined;
    recordFlowExecution(result: FlowExecutionResult): void;
    getWorkflowRecommendation(context: FlowExecutionContext): {
        phase: DesignPhase;
        nextFlow: FlowId;
        sequenceProgress: string;
    };
}
export declare function createOrchestrator(history: FlowHistory): SidecoachOrchestrator;
//# sourceMappingURL=orchestrator.d.ts.map