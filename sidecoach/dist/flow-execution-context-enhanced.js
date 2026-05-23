"use strict";
/**
 * Phase I Block 1: Enhanced Flow Execution Context
 * Extends flow execution with rich metadata, context propagation, and tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMON_PROPAGATION_RULES = exports.EnhancedContextManager = void 0;
/**
 * Enhanced context manager
 */
class EnhancedContextManager {
    constructor() {
        this.contextHistory = [];
        this.executionChain = [];
        this.propagationRules = new Map();
    }
    /**
     * Create enhanced context from base context
     */
    static createEnhancedContext(baseContext, flowId, flowName) {
        const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return {
            ...baseContext,
            flowMetadata: {
                flowId,
                flowName,
                executionTimestamp: Date.now(),
                executionId,
                userEmail: baseContext.userId,
                sessionId: baseContext.metadata?.sessionId,
                tags: [],
            },
            executionChain: [],
            contextSnapshot: {
                timestamp: Date.now(),
                file: baseContext.currentFile,
                selectedText: baseContext.selectedText,
                projectPath: baseContext.projectPath,
                metadata: baseContext.metadata,
            },
        };
    }
    /**
     * Add flow to execution chain
     */
    addToExecutionChain(flowId, flowName) {
        this.executionChain.push({
            flowId,
            flowName,
            startTime: Date.now(),
            status: 'executing',
        });
    }
    /**
     * Complete flow in execution chain
     */
    completeInChain(flowId, status, resultSummary) {
        const entry = this.executionChain.find(e => e.flowId === flowId && !e.endTime);
        if (entry) {
            entry.endTime = Date.now();
            entry.status = status;
            entry.resultSummary = resultSummary;
        }
    }
    /**
     * Get execution chain history
     */
    getExecutionChain() {
        return [...this.executionChain];
    }
    /**
     * Get execution duration
     */
    getExecutionDuration(flowId) {
        const entry = this.executionChain.find(e => e.flowId === flowId);
        if (!entry || !entry.endTime)
            return null;
        return entry.endTime - entry.startTime;
    }
    /**
     * Add context snapshot
     */
    snapshot(context) {
        this.contextHistory.push({
            ...context.contextSnapshot,
            timestamp: Date.now(),
        });
    }
    /**
     * Get context history
     */
    getContextHistory() {
        return [...this.contextHistory];
    }
    /**
     * Register context propagation rule
     */
    registerPropagationRule(rule) {
        const key = `${rule.sourceFlow}→${rule.targetFlow}`;
        this.propagationRules.set(key, rule);
    }
    /**
     * Propagate context between flows
     */
    propagateContext(sourceContext, sourceFlowId, targetFlowId) {
        const ruleKey = `${sourceFlowId}→${targetFlowId}`;
        const rule = this.propagationRules.get(ruleKey);
        if (!rule) {
            // Default propagation: pass through all context
            return sourceContext;
        }
        // Apply transformation if defined
        if (rule.transformContext) {
            return rule.transformContext(sourceContext);
        }
        // Propagate specified properties
        const propagated = {};
        for (const prop of rule.propagateProperties) {
            if (prop in sourceContext) {
                propagated[prop] = sourceContext[prop];
            }
        }
        return propagated;
    }
    /**
     * Add tags to execution metadata
     */
    addTags(context, tags) {
        context.flowMetadata.tags = [...(context.flowMetadata.tags || []), ...tags];
    }
    /**
     * Add custom data to execution metadata
     */
    addCustomData(context, key, value) {
        if (!context.flowMetadata.customData) {
            context.flowMetadata.customData = {};
        }
        context.flowMetadata.customData[key] = value;
    }
    /**
     * Get execution summary
     */
    getExecutionSummary() {
        const completed = this.executionChain.filter(e => e.status === 'completed');
        const errors = this.executionChain.filter(e => e.status === 'error');
        const skipped = this.executionChain.filter(e => e.status === 'skipped');
        const durations = this.executionChain
            .filter(e => e.endTime)
            .map(e => (e.endTime - e.startTime));
        const totalDuration = durations.reduce((sum, d) => sum + d, 0);
        const averageDuration = durations.length > 0 ? totalDuration / durations.length : 0;
        return {
            totalFlows: this.executionChain.length,
            completedFlows: completed.length,
            errorFlows: errors.length,
            skippedFlows: skipped.length,
            totalDuration,
            averageFlowDuration: averageDuration,
        };
    }
}
exports.EnhancedContextManager = EnhancedContextManager;
/**
 * Predefined context propagation rules for common flow sequences
 */
exports.COMMON_PROPAGATION_RULES = [
    // Research -> Execution flows propagate findings
    {
        sourceFlow: 'flowB_component_research',
        targetFlow: 'flowG_component_implementation',
        propagateProperties: ['utterance', 'projectContext', 'metadata'],
        transformContext: (ctx) => ({
            metadata: {
                ...ctx.metadata,
                researchSource: ctx.flowMetadata.flowId,
            },
        }),
    },
    // Design tokens -> Implementation
    {
        sourceFlow: 'flowF_design_tokens',
        targetFlow: 'flowG_component_implementation',
        propagateProperties: ['projectContext', 'metadata'],
    },
    // Motion patterns -> Motion integration
    {
        sourceFlow: 'flowE_motion_patterns',
        targetFlow: 'flowH_motion_integration',
        propagateProperties: ['projectContext', 'metadata'],
    },
    // Accessibility review -> Implementation improvements
    {
        sourceFlow: 'flowI_accessibility',
        targetFlow: 'flowG_component_implementation',
        propagateProperties: ['metadata'],
        transformContext: (ctx) => ({
            metadata: {
                ...ctx.metadata,
                accessibilityReviewSource: ctx.flowMetadata.executionId,
            },
        }),
    },
    // Polish -> QA
    {
        sourceFlow: 'flowJ_tactical_polish',
        targetFlow: 'flowV_all_seven_qa',
        propagateProperties: ['projectContext', 'metadata'],
    },
];
//# sourceMappingURL=flow-execution-context-enhanced.js.map