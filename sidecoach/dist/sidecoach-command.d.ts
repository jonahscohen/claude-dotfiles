import { FlowId } from './types';
import { FlowExecutionContext } from './flow-handler';
export interface SidecoachCommandConfig {
    command: string;
    args?: string[];
    context?: Partial<FlowExecutionContext>;
}
export interface SidecoachCommandResult {
    success: boolean;
    command: string;
    flowsExecuted: FlowId[];
    results: Record<string, unknown>;
    error?: string;
}
export declare class SidecoachCommand {
    private engine;
    constructor();
    execute(config: SidecoachCommandConfig): Promise<SidecoachCommandResult>;
    getAvailableCommands(): Record<string, string>;
}
export declare function createSidecoachCommand(): SidecoachCommand;
//# sourceMappingURL=sidecoach-command.d.ts.map