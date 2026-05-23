import { BaseFlowHandler, FlowExecutionContext, FlowExecutionResult } from './flow-handler';
export declare class FlowTAmbitiousMotionHandler extends BaseFlowHandler {
    constructor();
    canExecute(context: FlowExecutionContext): boolean;
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
export declare function createFlowTHandler(): FlowTAmbitiousMotionHandler;
//# sourceMappingURL=flow-handler-ambitious-motion.d.ts.map