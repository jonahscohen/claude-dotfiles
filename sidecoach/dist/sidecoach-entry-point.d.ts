import { FlowId } from './types';
export interface EntryPointRequest {
    utterance: string;
    userId: string;
    projectPath: string;
    sessionContext?: Record<string, any>;
}
export interface EntryPointResponse {
    isValid: boolean;
    entryType: 'slash_command' | 'natural_language' | 'composite' | 'discovery';
    selectedFlows: FlowId[];
    primaryFlow?: FlowId;
    reason: string;
    discoveryMode?: boolean;
    availableAlternatives?: FlowId[];
}
export interface EntryPointMetrics {
    totalRequests: number;
    slashCommandRequests: number;
    naturalLanguageRequests: number;
    discoveryRequests: number;
    invalidRequests: number;
    successRate: number;
    averageFlowsPerRequest: number;
}
export declare class SidecoachEntryPoint {
    private metrics;
    private flowCounts;
    private researchKeywords;
    private implementKeywords;
    private reviewKeywords;
    private cloneKeywords;
    private constrainKeywords;
    private migrateKeywords;
    private refactorKeywords;
    private typeKeywords;
    private motionKeywords;
    private referenceKeywords;
    private comprehensiveKeywords;
    process(request: EntryPointRequest): EntryPointResponse;
    private handleSlashCommand;
    private handleNaturalLanguage;
    private detectPhase;
    private mapPhaseToCommand;
    private matchesKeywords;
    private recordFlowSelection;
    private updateSuccessRate;
    getAvailableFlows(): Record<string, string[]>;
    getCommandsByWorkflow(): import("./slash-command-router").CommandsByPhase;
    getMetrics(): EntryPointMetrics;
    resetMetrics(): void;
}
export declare const globalEntryPoint: SidecoachEntryPoint;
//# sourceMappingURL=sidecoach-entry-point.d.ts.map