// Phase III Block 2: Extended Metadata Tracking
// Track execution metrics, decisions, and validation results per flow

export interface FlowMetrics {
  executionDuration: number; // milliseconds
  startTime: number; // timestamp
  endTime: number; // timestamp
  memoryUsed: number; // bytes
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
  passRate: number; // 0-100
  failedRules: string[];
}

export interface ArtifactRecord {
  type: 'reference' | 'template' | 'checklist' | 'guide' | 'code';
  name: string;
  description: string;
  created: number; // timestamp
  size?: number; // bytes
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

export class FlowMetricsTracker {
  private flowMetrics: Map<string, ExtendedFlowMetadata> = new Map();

  startTracking(flowId: string, flowName: string, executionId: string): void {
    const metadata: ExtendedFlowMetadata = {
      flowId,
      flowName,
      executionId,
      timestamp: Date.now(),
      metrics: {
        executionDuration: 0,
        startTime: Date.now(),
        endTime: 0,
        memoryUsed: 0,
        checklistItemsCompleted: 0,
        checklistItemsTotal: 0,
        artifactsProduced: 0,
        decisionsRecorded: 0,
        validationsPassed: 0,
        validationsFailed: 0,
      },
      decisions: [],
      validations: [],
      artifacts: [],
      contextSnapshot: {
        metadataKeys: [],
      },
    };

    this.flowMetrics.set(executionId, metadata);
  }

  recordDecision(executionId: string, decision: string, rationale: string, impact: 'high' | 'medium' | 'low'): void {
    const metadata = this.flowMetrics.get(executionId);
    if (!metadata) return;

    metadata.decisions.push({
      timestamp: Date.now(),
      decision,
      rationale,
      impact,
    });

    metadata.metrics.decisionsRecorded++;
  }

  recordValidation(
    executionId: string,
    domain: string,
    rulesTotal: number,
    rulesPassed: number,
    failedRules: string[] = []
  ): void {
    const metadata = this.flowMetrics.get(executionId);
    if (!metadata) return;

    const rulesFailed = rulesTotal - rulesPassed;
    const passRate = rulesTotal > 0 ? Math.round((rulesPassed / rulesTotal) * 100) : 0;

    metadata.validations.push({
      domain,
      rulesTotal,
      rulesPassed,
      rulesFailed,
      passRate,
      failedRules,
    });

    metadata.metrics.validationsPassed += rulesPassed;
    metadata.metrics.validationsFailed += rulesFailed;
  }

  recordArtifact(
    executionId: string,
    type: 'reference' | 'template' | 'checklist' | 'guide' | 'code',
    name: string,
    description: string,
    size?: number
  ): void {
    const metadata = this.flowMetrics.get(executionId);
    if (!metadata) return;

    metadata.artifacts.push({
      type,
      name,
      description,
      created: Date.now(),
      size,
    });

    metadata.metrics.artifactsProduced++;
  }

  updateChecklistProgress(executionId: string, completed: number, total: number): void {
    const metadata = this.flowMetrics.get(executionId);
    if (!metadata) return;

    metadata.metrics.checklistItemsCompleted = completed;
    metadata.metrics.checklistItemsTotal = total;
  }

  completeTracking(executionId: string, contextSnapshot?: { projectPath?: string; userId?: string; metadataKeys: string[] }): ExtendedFlowMetadata | undefined {
    const metadata = this.flowMetrics.get(executionId);
    if (!metadata) return undefined;

    metadata.metrics.endTime = Date.now();
    metadata.metrics.executionDuration = metadata.metrics.endTime - metadata.metrics.startTime;

    // Record memory if available (estimate)
    if (global.gc) {
      const memBefore = process.memoryUsage().heapUsed;
      global.gc();
      const memAfter = process.memoryUsage().heapUsed;
      metadata.metrics.memoryUsed = Math.max(0, memBefore - memAfter);
    }

    if (contextSnapshot) {
      metadata.contextSnapshot = contextSnapshot;
    }

    return metadata;
  }

  getMetadata(executionId: string): ExtendedFlowMetadata | undefined {
    return this.flowMetrics.get(executionId);
  }

  getAllMetadata(): ExtendedFlowMetadata[] {
    return Array.from(this.flowMetrics.values());
  }

  clearMetadata(executionId: string): void {
    this.flowMetrics.delete(executionId);
  }

  getMetricsSummary(executionId: string): Record<string, any> | undefined {
    const metadata = this.flowMetrics.get(executionId);
    if (!metadata) return undefined;

    return {
      flowId: metadata.flowId,
      flowName: metadata.flowName,
      duration: `${metadata.metrics.executionDuration}ms`,
      checklistCompletion: `${metadata.metrics.checklistItemsCompleted}/${metadata.metrics.checklistItemsTotal}`,
      validationSummary: {
        passed: metadata.metrics.validationsPassed,
        failed: metadata.metrics.validationsFailed,
        passRate: `${metadata.metrics.validationsPassed + metadata.metrics.validationsFailed > 0 ? Math.round((metadata.metrics.validationsPassed / (metadata.metrics.validationsPassed + metadata.metrics.validationsFailed)) * 100) : 0}%`,
      },
      decisionsRecorded: metadata.metrics.decisionsRecorded,
      artifactsProduced: metadata.metrics.artifactsProduced,
      validationDomains: metadata.validations.map(v => v.domain),
    };
  }
}

// Global singleton instance
export const globalMetricsTracker = new FlowMetricsTracker();
