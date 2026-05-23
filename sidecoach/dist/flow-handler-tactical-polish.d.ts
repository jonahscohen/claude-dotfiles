import { BaseFlowHandler, FlowExecutionContext, FlowExecutionResult } from './flow-handler';
export declare class FlowJTacticalPolishHandler extends BaseFlowHandler {
    constructor();
    canExecute(context: FlowExecutionContext): boolean;
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
export declare function createFlowJHandler(): FlowJTacticalPolishHandler;
//# sourceMappingURL=flow-handler-tactical-polish.d.ts.map