"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegressionDetector = void 0;
exports.createRegressionDetector = createRegressionDetector;
class RegressionDetector {
    /**
     * Compare current run against prior run and detect degradation
     */
    compare(flowId, current, history) {
        const regressions = [];
        const baseline = history.getBaselineRun(flowId);
        // No baseline to compare against - first run is always OK
        if (!baseline) {
            return {
                hasRegression: false,
                regressions: [],
                message: 'No baseline to compare - first run recorded',
            };
        }
        // Gate 1: Status regression (blocking)
        // If flow was successful before but failed now, that's a blocking regression
        if (baseline.status === 'success' && (current.status === 'error' || current.status === 'skipped')) {
            regressions.push({
                field: 'status',
                previous: baseline.status,
                current: current.status,
                severity: 'blocking',
                message: `Flow status degraded from "success" to "${current.status}"`,
            });
        }
        // Gate 2: Guidance count drop (warning)
        // If guidance count drops below 50% of prior run, that's a warning
        const baselineGuidanceCount = baseline.guidance?.length || 0;
        const currentGuidanceCount = current.guidance?.length || 0;
        if (baselineGuidanceCount > 0 && currentGuidanceCount < baselineGuidanceCount * 0.5) {
            regressions.push({
                field: 'guidance_count',
                previous: baselineGuidanceCount,
                current: currentGuidanceCount,
                severity: 'warning',
                message: `Guidance count dropped from ${baselineGuidanceCount} to ${currentGuidanceCount} (below 50% threshold)`,
            });
        }
        // Gate 3: Checklist item count drop (warning)
        // If checklist items drop significantly, that's a warning
        const baselineChecklistCount = baseline.checklist?.length || 0;
        const currentChecklistCount = current.checklist?.length || 0;
        if (baselineChecklistCount > 0 && currentChecklistCount < baselineChecklistCount * 0.5) {
            regressions.push({
                field: 'checklist_item_count',
                previous: baselineChecklistCount,
                current: currentChecklistCount,
                severity: 'warning',
                message: `Checklist items dropped from ${baselineChecklistCount} to ${currentChecklistCount} (below 50% threshold)`,
            });
        }
        // Gate 4: Message quality drop (warning)
        // If message is less than 25% the length of prior message, that's a warning
        const baselineMessageLength = baseline.message?.length || 0;
        const currentMessageLength = current.message?.length || 0;
        if (baselineMessageLength > 0 && currentMessageLength < baselineMessageLength * 0.25) {
            regressions.push({
                field: 'message_quality',
                previous: baselineMessageLength,
                current: currentMessageLength,
                severity: 'warning',
                message: `Message quality degraded: ${currentMessageLength} chars vs baseline ${baselineMessageLength} (below 25% threshold)`,
            });
        }
        // Determine overall severity
        const hasBlocking = regressions.some((r) => r.severity === 'blocking');
        const hasWarning = regressions.some((r) => r.severity === 'warning');
        let message = '';
        if (hasBlocking) {
            message = `Regression detected: ${regressions.filter((r) => r.severity === 'blocking').length} blocking issue(s)`;
            if (hasWarning) {
                message += `, ${regressions.filter((r) => r.severity === 'warning').length} warning(s)`;
            }
        }
        else if (hasWarning) {
            message = `Regression detected: ${regressions.length} warning(s)`;
        }
        else {
            message = 'No regression detected';
        }
        return {
            hasRegression: regressions.length > 0,
            regressions,
            message,
        };
    }
}
exports.RegressionDetector = RegressionDetector;
function createRegressionDetector() {
    return new RegressionDetector();
}
//# sourceMappingURL=regression-detector.js.map