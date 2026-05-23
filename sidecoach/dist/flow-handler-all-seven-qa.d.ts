import { BaseFlowHandler, FlowExecutionContext, FlowExecutionResult } from './flow-handler';
export declare class FlowVAllSevenQAHandler extends BaseFlowHandler {
    constructor();
    canExecute(context: FlowExecutionContext): boolean;
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
export declare function createFlowVHandler(): FlowVAllSevenQAHandler;
//# sourceMappingURL=flow-handler-all-seven-qa.d.ts.map