import { BaseFlowHandler, FlowExecutionContext, FlowExecutionResult } from './flow-handler';
export declare class FlowMResponsiveValidationHandler extends BaseFlowHandler {
    constructor();
    canExecute(context: FlowExecutionContext): boolean;
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
export declare function createFlowMHandler(): FlowMResponsiveValidationHandler;
//# sourceMappingURL=flow-handler-responsive-validation.d.ts.map