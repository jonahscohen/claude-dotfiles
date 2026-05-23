import { BaseFlowHandler, FlowExecutionContext, FlowExecutionResult } from './flow-handler';
export declare class FlowRLayoutOptimizationHandler extends BaseFlowHandler {
    constructor();
    canExecute(context: FlowExecutionContext): boolean;
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
export declare function createFlowRHandler(): FlowRLayoutOptimizationHandler;
//# sourceMappingURL=flow-handler-layout-optimization.d.ts.map