import { FlowId } from './types';
export interface CommandMatch {
    isCommand: boolean;
    command?: string;
    flowIds: FlowId[];
    target?: string;
    reason: string;
}
export declare function parseSlashCommand(utterance: string): CommandMatch;
export interface CommandInfo {
    description: string;
    flows: string[];
    phase: 'Research' | 'Implement' | 'Review' | 'Special';
}
export interface CommandsByPhase {
    [phase: string]: {
        commands: Array<{
            command: string;
            description: string;
            flowCount: number;
        }>;
    };
}
export declare function getAvailableCommands(): Record<string, CommandInfo>;
export declare function getCommandsByPhase(): CommandsByPhase;
//# sourceMappingURL=slash-command-router.d.ts.map