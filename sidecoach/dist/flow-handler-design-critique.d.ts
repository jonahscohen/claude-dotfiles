import { BaseFlowHandler, FlowExecutionContext, FlowExecutionResult } from './flow-handler';
export declare class FlowLDesignCritiqueHandler extends BaseFlowHandler {
    constructor();
    canExecute(context: FlowExecutionContext): boolean;
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
export declare function createFlowLHandler(): FlowLDesignCritiqueHandler;
//# sourceMappingURL=flow-handler-design-critique.d.ts.map