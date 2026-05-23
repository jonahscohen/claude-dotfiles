export interface FlowMetrics {
    executionDuration: number;
    startTime: number;
    endTime: number;
    memoryUsed: number;
    checklistItemsCompleted: number;
    checklistItemsTotal: number;
    artifactsProduced: number;
    decisionsRecorded: number;
    validationsPassed: number;
    validationsFailed: number;
}
export interface DecisionCheckpoint {
    timestamp: number;
    decision: string;
    rationale: string;
    impact: 'high' | 'medium' | 'low';
}
export interface ValidationAggregation {
    domain: string;
    rulesTotal: number;
    rulesPassed: number;
    rulesFailed: number;
    passRate: number;
    failedRules: string[];
}
export interface ArtifactRecord {
    type: 'reference' | 'template' | 'checklist' | 'guide' | 'code';
    name: string;
    description: string;
    created: number;
    size?: number;
}
export interface ExtendedFlowMetadata {
    flowId: string;
    flowName: string;
    executionId: string;
    timestamp: number;
    metrics: FlowMetrics;
    decisions: DecisionCheckpoint[];
    validations: ValidationAggregation[];
    artifacts: ArtifactRecord[];
    contextSnapshot: {
        projectPath?: string;
        userId?: string;
        metadataKeys: string[];
    };
}
export declare class FlowMetricsTracker {
    private flowMetrics;
    startTracking(flowId: string, flowName: string, executionId: string): void;
    recordDecision(executionId: string, decision: string, rationale: string, impact: 'high' | 'medium' | 'low'): void;
    recordValidation(executionId: string, domain: string, rulesTotal: number, rulesPassed: number, failedRules?: string[]): void;
    recordArtifact(executionId: string, type: 'reference' | 'template' | 'checklist' | 'guide' | 'code', name: string, description: string, size?: number): void;
    updateChecklistProgress(executionId: string, completed: number, total: number): void;
    completeTracking(executionId: string, contextSnapshot?: {
        projectPath?: string;
        userId?: string;
        metadataKeys: string[];
    }): ExtendedFlowMetadata | undefined;
    getMetadata(executionId: string): ExtendedFlowMetadata | undefined;
    getAllMetadata(): ExtendedFlowMetadata[];
    clearMetadata(executionId: string): void;
    getMetricsSummary(executionId: string): Record<string, any> | undefined;
}
export declare const globalMetricsTracker: FlowMetricsTracker;
//# sourceMappingURL=flow-metrics-tracker.d.ts.map