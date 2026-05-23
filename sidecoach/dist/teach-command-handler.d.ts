import { FlowExecutionContext, FlowExecutionResult } from './flow-handler';
export interface TeachResponse {
    userGroup: string;
    designType: 'brand' | 'product';
    brandPersonality?: string;
    antiReferences: string;
    strategicPrinciples: string;
}
export declare class TeachCommandHandler {
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
    private generateProductMd;
}
//# sourceMappingURL=teach-command-handler.d.ts.map