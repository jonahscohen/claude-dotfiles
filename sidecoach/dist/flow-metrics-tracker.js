"use strict";
// Phase III Block 2: Extended Metadata Tracking
// Track execution metrics, decisions, and validation results per flow
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalMetricsTracker = exports.FlowMetricsTracker = void 0;
class FlowMetricsTracker {
    constructor() {
        this.flowMetrics = new Map();
    }
    startTracking(flowId, flowName, executionId) {
        const metadata = {
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
    recordDecision(executionId, decision, rationale, impact) {
        const metadata = this.flowMetrics.get(executionId);
        if (!metadata)
            return;
        metadata.decisions.push({
            timestamp: Date.now(),
            decision,
            rationale,
            impact,
        });
        metadata.metrics.decisionsRecorded++;
    }
    recordValidation(executionId, domain, rulesTotal, rulesPassed, failedRules = []) {
        const metadata = this.flowMetrics.get(executionId);
        if (!metadata)
            return;
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
    recordArtifact(executionId, type, name, description, size) {
        const metadata = this.flowMetrics.get(executionId);
        if (!metadata)
            return;
        metadata.artifacts.push({
            type,
            name,
            description,
            created: Date.now(),
            size,
        });
        metadata.metrics.artifactsProduced++;
    }
    updateChecklistProgress(executionId, completed, total) {
        const metadata = this.flowMetrics.get(executionId);
        if (!metadata)
            return;
        metadata.metrics.checklistItemsCompleted = completed;
        metadata.metrics.checklistItemsTotal = total;
    }
    completeTracking(executionId, contextSnapshot) {
        const metadata = this.flowMetrics.get(executionId);
        if (!metadata)
            return undefined;
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
    getMetadata(executionId) {
        return this.flowMetrics.get(executionId);
    }
    getAllMetadata() {
        return Array.from(this.flowMetrics.values());
    }
    clearMetadata(executionId) {
        this.flowMetrics.delete(executionId);
    }
    getMetricsSummary(executionId) {
        const metadata = this.flowMetrics.get(executionId);
        if (!metadata)
            return undefined;
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
exports.FlowMetricsTracker = FlowMetricsTracker;
// Global singleton instance
exports.globalMetricsTracker = new FlowMetricsTracker();
//# sourceMappingURL=flow-metrics-tracker.js.map