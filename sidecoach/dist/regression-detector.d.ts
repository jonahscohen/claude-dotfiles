import { FlowId } from './types';
import { FlowExecutionResult } from './flow-handler';
import { FlowHistory } from './flow-history';
export interface Regression {
    field: 'status' | 'guidance_count' | 'message_quality' | 'checklist_item_count';
    previous: string | number;
    current: string | number;
    severity: 'blocking' | 'warning';
    message: string;
}
export interface RegressionResult {
    hasRegression: boolean;
    regressions: Regression[];
    message: string;
}
export declare class RegressionDetector {
    /**
     * Compare current run against prior run and detect degradation
     */
    compare(flowId: FlowId, current: FlowExecutionResult, history: FlowHistory): RegressionResult;
}
export declare function createRegressionDetector(): RegressionDetector;
//# sourceMappingURL=regression-detector.d.ts.map