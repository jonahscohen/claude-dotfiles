import { BaseFlowHandler, FlowExecutionContext, FlowExecutionResult } from './flow-handler';
export declare class FlowNRapidIterationHandler extends BaseFlowHandler {
    constructor();
    canExecute(context: FlowExecutionContext): boolean;
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
export declare function createFlowNHandler(): FlowNRapidIterationHandler;
//# sourceMappingURL=flow-handler-rapid-iteration.d.ts.map