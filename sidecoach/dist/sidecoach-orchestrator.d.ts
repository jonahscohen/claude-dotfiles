import { FlowHandler, FlowExecutionContext, FlowExecutionResult } from './flow-handler';
import { FlowId } from './types';
export declare class FlowExecutionEngine {
    private intentDetector;
    private handlers;
    private orchestrator;
    private compositionEngine;
    private contextManager;
    constructor();
    private initializeValidators;
    private initializeHandlers;
    private recordFlowWithMemory;
    private validateFlowExecution;
    private cacheFlowResult;
    private trackFlowMetrics;
    private determineConditionalFlow;
    private getExecutablePath;
    private processWithEntryPoint;
    process(utterance: string, context?: Partial<FlowExecutionContext>): Promise<SidecoachResult>;
    private showInteractiveMenu;
    registerHandler(handler: FlowHandler): void;
    getAvailableFlows(): FlowInfo[];
}
export interface FlowInfo {
    flowId: FlowId;
    name: string;
    description: string;
}
export interface SidecoachResult {
    success: boolean;
    message: string;
    detectedFlow: {
        flowId: FlowId;
        flowName: string;
        confidence: number;
    } | null;
    flowResults: FlowExecutionResult[];
    guidance?: string[];
    checklist?: any[];
    artifacts?: any[];
    ambiguousCandidates?: Array<{
        flowId: FlowId;
        flowName: string;
        confidence: number;
    }>;
}
export declare function createExecutionEngine(): FlowExecutionEngine;
//# sourceMappingURL=sidecoach-orchestrator.d.ts.map