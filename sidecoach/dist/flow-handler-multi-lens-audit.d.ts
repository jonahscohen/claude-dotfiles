import { BaseFlowHandler, FlowExecutionContext, FlowExecutionResult } from './flow-handler';
export declare class FlowKMultiLensAuditHandler extends BaseFlowHandler {
    constructor();
    canExecute(context: FlowExecutionContext): boolean;
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
export declare function createFlowKHandler(): FlowKMultiLensAuditHandler;
//# sourceMappingURL=flow-handler-multi-lens-audit.d.ts.map