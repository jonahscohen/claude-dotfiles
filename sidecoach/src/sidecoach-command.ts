import { FlowExecutionEngine } from './sidecoach-orchestrator';
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

// Command to flow mapping
const COMMAND_FLOW_MAP: Record<string, FlowId[]> = {
  // Research/Analysis commands
  research: ['flowB_component_research'],      // Component Research
  audit: ['flowI_accessibility'],         // Accessibility audit
  critique: ['flowL_design_critique'],      // Design Critique (critical review)

  // Implementation commands
  craft: ['flowG_component_implementation'],         // Component Implementation
  implement: ['flowG_component_implementation'],     // Component Implementation

  // Enhancement commands
  polish: ['flowJ_tactical_polish'],        // Polish Standard
  refine: ['flowJ_tactical_polish'],        // Polish Standard

  // Validation commands
  validate: ['flowI_accessibility', 'flowJ_tactical_polish'],  // Accessibility + Polish
  check: ['flowD_reference_inspiration'],         // Design References validation

  // Design planning commands
  shape: ['flowA_brand_verify', 'flowB_component_research'],    // Brand + Components
  plan: ['flowA_brand_verify', 'flowB_component_research'],     // Brand + Components

  // Token/System commands
  tokens: ['flowF_design_tokens'],        // Design Tokens
  extract: ['flowF_design_tokens'],       // Design Tokens

  // Motion/Animation commands
  animate: ['flowH_motion_integration'],       // Motion Integration
  motion: ['flowE_motion_patterns'],        // Motion Patterns
};

export class SidecoachCommand {
  private engine: FlowExecutionEngine;

  constructor() {
    this.engine = new FlowExecutionEngine();
  }

  async execute(config: SidecoachCommandConfig): Promise<SidecoachCommandResult> {
    const { command, args = [], context = {} } = config;
    const lowerCommand = command.toLowerCase().trim();

    // Validate command exists
    const flows = COMMAND_FLOW_MAP[lowerCommand];
    if (!flows) {
      return {
        success: false,
        command,
        flowsExecuted: [],
        results: {},
        error: `Unknown command: ${command}. Available: ${Object.keys(COMMAND_FLOW_MAP).join(', ')}`
      };
    }

    try {
      // Build utterance from command and args
      const utterance = args.length > 0 ? `${command} ${args.join(' ')}` : command;

      // Execute via orchestrator with context
      const result = await this.engine.process(utterance, context);

      return {
        success: result.success,
        command,
        flowsExecuted: result.detectedFlow ? [result.detectedFlow.flowId] : [],
        results: {
          flowResults: result.flowResults,
          message: result.message,
          guidance: result.guidance,
          artifacts: result.artifacts
        },
        error: result.success ? undefined : result.message
      };
    } catch (error) {
      return {
        success: false,
        command,
        flowsExecuted: [],
        results: {},
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  getAvailableCommands(): Record<string, string> {
    return {
      research: 'Analyze design patterns and components',
      audit: 'Audit accessibility and standards compliance',
      critique: 'Critical design review against brand guidelines',
      craft: 'Implement a design component',
      implement: 'Implement a design feature',
      polish: 'Final refinement and polish pass',
      refine: 'Refine existing design',
      validate: 'Full validation (accessibility + polish)',
      check: 'Check against design references',
      shape: 'Plan and structure design',
      plan: 'Plan design approach',
      tokens: 'Extract and manage design tokens',
      extract: 'Extract design system tokens',
      animate: 'Add animations and transitions',
      motion: 'Validate motion patterns'
    };
  }
}

// Export factory for use in skill
export function createSidecoachCommand(): SidecoachCommand {
  return new SidecoachCommand();
}
