/**
 * Phase I Block 1: Enhanced Flow Execution Context
 * Extends flow execution with rich metadata, context propagation, and tracking
 */

import { FlowId } from './types';
import { ProjectContext } from './project-context';
import { FlowMemoryEntry } from './flow-memory-schema';

/**
 * Enhanced execution context with metadata and tracking
 */
export interface EnhancedFlowExecutionContext {
  // Core execution context
  utterance: string;
  userId?: string;
  projectPath?: string;
  currentFile?: string;
  selectedText?: string;

  // Project and environment context
  projectContext?: ProjectContext;
  metadata?: Record<string, any>;

  // Phase I: Enhanced metadata
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
  executionId: string; // Unique ID for this execution
  parentFlowId?: FlowId; // If nested or chained
  compositeFlowId?: string; // If part of composite
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
export class EnhancedContextManager {
  private contextHistory: ContextSnapshot[] = [];
  private executionChain: FlowExecutionChainEntry[] = [];
  private propagationRules: Map<string, ContextPropagationRule> = new Map();

  /**
   * Create enhanced context from base context
   */
  static createEnhancedContext(
    baseContext: any,
    flowId: FlowId,
    flowName: string
  ): EnhancedFlowExecutionContext {
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
  addToExecutionChain(flowId: FlowId, flowName: string): void {
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
  completeInChain(flowId: FlowId, status: 'completed' | 'error' | 'skipped', resultSummary?: string): void {
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
  getExecutionChain(): FlowExecutionChainEntry[] {
    return [...this.executionChain];
  }

  /**
   * Get execution duration
   */
  getExecutionDuration(flowId: FlowId): number | null {
    const entry = this.executionChain.find(e => e.flowId === flowId);
    if (!entry || !entry.endTime) return null;
    return entry.endTime - entry.startTime;
  }

  /**
   * Add context snapshot
   */
  snapshot(context: EnhancedFlowExecutionContext): void {
    this.contextHistory.push({
      ...context.contextSnapshot,
      timestamp: Date.now(),
    });
  }

  /**
   * Get context history
   */
  getContextHistory(): ContextSnapshot[] {
    return [...this.contextHistory];
  }

  /**
   * Register context propagation rule
   */
  registerPropagationRule(rule: ContextPropagationRule): void {
    const key = `${rule.sourceFlow}→${rule.targetFlow}`;
    this.propagationRules.set(key, rule);
  }

  /**
   * Propagate context between flows
   */
  propagateContext(
    sourceContext: EnhancedFlowExecutionContext,
    sourceFlowId: FlowId,
    targetFlowId: FlowId
  ): Partial<EnhancedFlowExecutionContext> {
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
    const propagated: Record<string, any> = {};
    for (const prop of rule.propagateProperties) {
      if (prop in sourceContext) {
        propagated[prop] = (sourceContext as Record<string, any>)[prop];
      }
    }

    return propagated as Partial<EnhancedFlowExecutionContext>;
  }

  /**
   * Add tags to execution metadata
   */
  addTags(context: EnhancedFlowExecutionContext, tags: string[]): void {
    context.flowMetadata.tags = [...(context.flowMetadata.tags || []), ...tags];
  }

  /**
   * Add custom data to execution metadata
   */
  addCustomData(context: EnhancedFlowExecutionContext, key: string, value: any): void {
    if (!context.flowMetadata.customData) {
      context.flowMetadata.customData = {};
    }
    context.flowMetadata.customData[key] = value;
  }

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
  } {
    const completed = this.executionChain.filter(e => e.status === 'completed');
    const errors = this.executionChain.filter(e => e.status === 'error');
    const skipped = this.executionChain.filter(e => e.status === 'skipped');

    const durations = this.executionChain
      .filter(e => e.endTime)
      .map(e => (e.endTime! - e.startTime));

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

/**
 * Predefined context propagation rules for common flow sequences
 */
export const COMMON_PROPAGATION_RULES: ContextPropagationRule[] = [
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
