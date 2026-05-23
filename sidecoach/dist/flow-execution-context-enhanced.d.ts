/**
 * Phase I Block 1: Enhanced Flow Execution Context
 * Extends flow execution with rich metadata, context propagation, and tracking
 */
import { FlowId } from './types';
import { ProjectContext } from './project-context';
/**
 * Enhanced execution context with metadata and tracking
 */
export interface EnhancedFlowExecutionContext {
    utterance: string;
    userId?: string;
    projectPath?: string;
    currentFile?: string;
    selectedText?: string;
    projectContext?: ProjectContext;
    metadata?: Record<string, any>;
    flowMetadata: FlowContextMetadata;
    executionChain: FlowExecutionChainEntry[];
    contextSnapshot: ContextSnapshot;
}
/**
 * Rich metadata about flow execution
 */
export interface FlowContextMetadata {
    flowId: FlowId;
    flowName: string;
    executionTimestamp: number;
    executionId: string;
    parentFlowId?: FlowId;
    compositeFlowId?: string;
    userEmail?: string;
    sessionId?: string;
    tags?: string[];
    customData?: Record<string, any>;
}
/**
 * Entry in the execution chain
 */
export interface FlowExecutionChainEntry {
    flowId: FlowId;
    flowName: string;
    startTime: number;
    endTime?: number;
    status: 'pending' | 'executing' | 'completed' | 'error' | 'skipped';
    resultSummary?: string;
}
/**
 * Snapshot of execution context at a point in time
 */
export interface ContextSnapshot {
    timestamp: number;
    file?: string;
    selectedText?: string;
    projectPath?: string;
    metadata?: Record<string, any>;
}
/**
 * Context propagation rules
 */
export interface ContextPropagationRule {
    sourceFlow: FlowId;
    targetFlow: FlowId;
    propagateProperties: (keyof EnhancedFlowExecutionContext)[];
    transformContext?: (context: EnhancedFlowExecutionContext) => Partial<EnhancedFlowExecutionContext>;
}
/**
 * Enhanced context manager
 */
export declare class EnhancedContextManager {
    private contextHistory;
    private executionChain;
    private propagationRules;
    /**
     * Create enhanced context from base context
     */
    static createEnhancedContext(baseContext: any, flowId: FlowId, flowName: string): EnhancedFlowExecutionContext;
    /**
     * Add flow to execution chain
     */
    addToExecutionChain(flowId: FlowId, flowName: string): void;
    /**
     * Complete flow in execution chain
     */
    completeInChain(flowId: FlowId, status: 'completed' | 'error' | 'skipped', resultSummary?: string): void;
    /**
     * Get execution chain history
     */
    getExecutionChain(): FlowExecutionChainEntry[];
    /**
     * Get execution duration
     */
    getExecutionDuration(flowId: FlowId): number | null;
    /**
     * Add context snapshot
     */
    snapshot(context: EnhancedFlowExecutionContext): void;
    /**
     * Get context history
     */
    getContextHistory(): ContextSnapshot[];
    /**
     * Register context propagation rule
     */
    registerPropagationRule(rule: ContextPropagationRule): void;
    /**
     * Propagate context between flows
     */
    propagateContext(sourceContext: EnhancedFlowExecutionContext, sourceFlowId: FlowId, targetFlowId: FlowId): Partial<EnhancedFlowExecutionContext>;
    /**
     * Add tags to execution metadata
     */
    addTags(context: EnhancedFlowExecutionContext, tags: string[]): void;
    /**
     * Add custom data to execution metadata
     */
    addCustomData(context: EnhancedFlowExecutionContext, key: string, value: any): void;
    /**
     * Get execution summary
     */
    getExecutionSummary(): {
        totalFlows: number;
        completedFlows: number;
        errorFlows: number;
        skippedFlows: number;
        totalDuration: number;
        averageFlowDuration: number;
    };
}
/**
 * Predefined context propagation rules for common flow sequences
 */
export declare const COMMON_PROPAGATION_RULES: ContextPropagationRule[];
//# sourceMappingURL=flow-execution-context-enhanced.d.ts.map