export interface ImpeccableDetectFinding {
    rule: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    message: string;
    file?: string;
    line?: number;
    column?: number;
    selector?: string;
    fix?: string;
}
export interface DetectResult {
    success: boolean;
    findings: ImpeccableDetectFinding[];
    message: string;
    rulesCovered: number;
}
/**
 * Bridge to `npx impeccable detect` CLI
 * Runs the 28-rule static analyzer on project HTML/CSS
 * Fails gracefully if tool unavailable
 */
export declare class ImpeccableDetectBridge {
    /**
     * Run impeccable detect on project and return findings
     */
    detect(projectPath: string): DetectResult;
    /**
     * Check if project has HTML/CSS files to analyze
     */
    private hasWebFiles;
    /**
     * Transform impeccable output to our finding format
     */
    private transformFinding;
    /**
     * Convert findings to guidance items for flow output
     */
    findingsToGuidance(findings: ImpeccableDetectFinding[]): string[];
}
export declare function createDetectBridge(): ImpeccableDetectBridge;
//# sourceMappingURL=impeccable-detect-bridge.d.ts.map