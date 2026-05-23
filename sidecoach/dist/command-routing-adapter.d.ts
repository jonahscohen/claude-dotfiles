import { FlowExecutionContext } from './flow-handler';
import { FlowExecutionEngine, SidecoachResult } from './sidecoach-orchestrator';
export interface CommandRouteRequest {
    utterance: string;
    context: Partial<FlowExecutionContext>;
}
export interface CommandRouteResponse {
    isCommand: boolean;
    command?: string;
    result?: SidecoachResult;
    error?: string;
}
export declare class CommandRoutingAdapter {
    private orchestrator;
    constructor(orchestrator: FlowExecutionEngine);
    route(request: CommandRouteRequest): Promise<CommandRouteResponse>;
    private preprocessCommand;
    private enrichResult;
    isKnownCommand(command: string): boolean;
    getCommandsForPhase(phase: 'Research' | 'Implement' | 'Review' | 'Special'): Array<{
        command: string;
        description: string;
    }>;
    validateCommandArgs(command: string, args: string): {
        valid: boolean;
        message?: string;
    };
}
//# sourceMappingURL=command-routing-adapter.d.ts.map