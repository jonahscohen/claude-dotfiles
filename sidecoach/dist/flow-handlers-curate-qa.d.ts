import { BaseFlowHandler, FlowExecutionContext, FlowExecutionResult } from './flow-handler';
/**
 * Flow U: Curate - 5-Step Design Reference Capture
 * Wizard for adding components/patterns to the design-references catalog
 * Steps: source + selection, auto-tag, describe, slug, save
 */
export declare class FlowUCurateHandler extends BaseFlowHandler {
    constructor();
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
/**
 * Flow V: All-Seven QA - Comprehensive Design Pipeline QA
 * Chains all 7 tiers in sequence for end-to-end verification
 * Runs: Strategy (A-E) + Build (F-I) + Polish (J-P) + Specialized (Q-T)
 */
export declare class FlowVAllSevenQAHandler extends BaseFlowHandler {
    constructor();
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
export declare function registerCurateQAHandlers(): Array<[string, () => BaseFlowHandler]>;
//# sourceMappingURL=flow-handlers-curate-qa.d.ts.map