// Sidecoach Orchestrator
// Intelligent flow sequencing, phase detection, and prerequisite validation

import {
  BaseFlowHandler,
  FlowExecutionContext,
  FlowExecutionResult,
} from './flow-handler';
import { FlowId } from './types';
import { FlowHistory, FlowHistoryEntry } from './flow-history';

export type DesignPhase = 'research' | 'execution' | 'polish' | 'qa';

export interface FlowDependency {
  flowId: FlowId;
  prerequisiteFlows: FlowId[];
  prerequisiteArtifacts: string[];
  nextFlowsIfSuccess: FlowId[];
  nextFlowsIfIncomplete: FlowId[];
}

export interface FlowChain {
  phase: DesignPhase;
  flows: FlowId[];
  description: string;
}

export class SidecoachOrchestrator {
  private flowDependencies: Map<FlowId, FlowDependency> = new Map();
  private flowChains: Map<DesignPhase, FlowChain> = new Map();
  private history: FlowHistory;

  constructor(history: FlowHistory) {
    this.history = history;
    this.initializeDependencies();
    this.initializeFlowChains();
  }

  private initializeDependencies(): void {
    // Flow A: Brand Verification - foundation for all design work
    this.flowDependencies.set('flowA_brand_verify', {
      flowId: 'flowA_brand_verify',
      prerequisiteFlows: [],
      prerequisiteArtifacts: ['PRODUCT.md'],
      nextFlowsIfSuccess: [
        'flowB_component_research',
        'flowC_font_research',
        'flowD_reference_inspiration',
      ],
      nextFlowsIfIncomplete: [],
    });

    // Flow B: Component Research
    this.flowDependencies.set('flowB_component_research', {
      flowId: 'flowB_component_research',
      prerequisiteFlows: ['flowA_brand_verify'],
      prerequisiteArtifacts: [],
      nextFlowsIfSuccess: [
        'flowF_design_tokens',
        'flowG_component_implementation',
      ],
      nextFlowsIfIncomplete: ['flowC_font_research', 'flowD_reference_inspiration'],
    });

    // Flow C: Font Research
    this.flowDependencies.set('flowC_font_research', {
      flowId: 'flowC_font_research',
      prerequisiteFlows: ['flowA_brand_verify'],
      prerequisiteArtifacts: [],
      nextFlowsIfSuccess: ['flowF_design_tokens'],
      nextFlowsIfIncomplete: ['flowB_component_research', 'flowD_reference_inspiration'],
    });

    // Flow D: Design References
    this.flowDependencies.set('flowD_reference_inspiration', {
      flowId: 'flowD_reference_inspiration',
      prerequisiteFlows: ['flowA_brand_verify'],
      prerequisiteArtifacts: [],
      nextFlowsIfSuccess: [
        'flowB_component_research',
        'flowF_design_tokens',
      ],
      nextFlowsIfIncomplete: [],
    });

    // Flow E: Motion Patterns
    this.flowDependencies.set('flowE_motion_patterns', {
      flowId: 'flowE_motion_patterns',
      prerequisiteFlows: [],
      prerequisiteArtifacts: [],
      nextFlowsIfSuccess: ['flowH_motion_integration'],
      nextFlowsIfIncomplete: [],
    });

    // Flow F: Design Tokens - gating for all implementation
    this.flowDependencies.set('flowF_design_tokens', {
      flowId: 'flowF_design_tokens',
      prerequisiteFlows: ['flowA_brand_verify'],
      prerequisiteArtifacts: ['DESIGN.md'],
      nextFlowsIfSuccess: [
        'flowG_component_implementation',
        'flowH_motion_integration',
        'flowJ_tactical_polish',
      ],
      nextFlowsIfIncomplete: [],
    });

    // Flow G: Component Implementation
    this.flowDependencies.set('flowG_component_implementation', {
      flowId: 'flowG_component_implementation',
      prerequisiteFlows: ['flowF_design_tokens'],
      prerequisiteArtifacts: ['DESIGN.md'],
      nextFlowsIfSuccess: ['flowI_accessibility', 'flowJ_tactical_polish'],
      nextFlowsIfIncomplete: ['flowH_motion_integration'],
    });

    // Flow H: Motion Integration
    this.flowDependencies.set('flowH_motion_integration', {
      flowId: 'flowH_motion_integration',
      prerequisiteFlows: ['flowE_motion_patterns'],
      prerequisiteArtifacts: [],
      nextFlowsIfSuccess: ['flowI_accessibility', 'flowJ_tactical_polish'],
      nextFlowsIfIncomplete: [],
    });

    // Flow I: Accessibility
    this.flowDependencies.set('flowI_accessibility', {
      flowId: 'flowI_accessibility',
      prerequisiteFlows: [
        'flowG_component_implementation',
        'flowH_motion_integration',
      ],
      prerequisiteArtifacts: [],
      nextFlowsIfSuccess: ['flowJ_tactical_polish'],
      nextFlowsIfIncomplete: [],
    });

    // Flow J: Tactical Polish
    this.flowDependencies.set('flowJ_tactical_polish', {
      flowId: 'flowJ_tactical_polish',
      prerequisiteFlows: ['flowI_accessibility'],
      prerequisiteArtifacts: [],
      nextFlowsIfSuccess: ['flowK_multi_lens_audit'],
      nextFlowsIfIncomplete: [],
    });

    // Tier 3: Polish/QA Flows
    // Flow K: Multi-Lens Audit
    this.flowDependencies.set('flowK_multi_lens_audit', {
      flowId: 'flowK_multi_lens_audit',
      prerequisiteFlows: ['flowJ_tactical_polish'],
      prerequisiteArtifacts: ['DESIGN.md'],
      nextFlowsIfSuccess: ['flowL_design_critique'],
      nextFlowsIfIncomplete: [],
    });

    // Flow L: Design Critique
    this.flowDependencies.set('flowL_design_critique', {
      flowId: 'flowL_design_critique',
      prerequisiteFlows: ['flowK_multi_lens_audit'],
      prerequisiteArtifacts: ['PRODUCT.md'],
      nextFlowsIfSuccess: ['flowM_responsive_validation'],
      nextFlowsIfIncomplete: [],
    });

    // Flow M: Responsive Validation
    this.flowDependencies.set('flowM_responsive_validation', {
      flowId: 'flowM_responsive_validation',
      prerequisiteFlows: ['flowK_multi_lens_audit'],
      prerequisiteArtifacts: ['DESIGN.md'],
      nextFlowsIfSuccess: ['flowN_rapid_iteration_refined'],
      nextFlowsIfIncomplete: [],
    });

    // Flow N: Rapid Iteration
    this.flowDependencies.set('flowN_rapid_iteration_refined', {
      flowId: 'flowN_rapid_iteration_refined',
      prerequisiteFlows: ['flowM_responsive_validation'],
      prerequisiteArtifacts: ['DESIGN.md'],
      nextFlowsIfSuccess: [],
      nextFlowsIfIncomplete: [],
    });

    // Tier 4: Special Flows
    // Flow O: Clone/Match
    this.flowDependencies.set('flowO_clone_match_special', {
      flowId: 'flowO_clone_match_special',
      prerequisiteFlows: ['flowA_brand_verify'],
      prerequisiteArtifacts: [],
      nextFlowsIfSuccess: ['flowJ_tactical_polish'],
      nextFlowsIfIncomplete: [],
    });

    // Flow P: Constraint Design
    this.flowDependencies.set('flowP_constraint_design_special', {
      flowId: 'flowP_constraint_design_special',
      prerequisiteFlows: ['flowA_brand_verify'],
      prerequisiteArtifacts: ['PRODUCT.md'],
      nextFlowsIfSuccess: ['flowJ_tactical_polish'],
      nextFlowsIfIncomplete: [],
    });

    // Flow Q: Migration
    this.flowDependencies.set('flowQ_migration_special', {
      flowId: 'flowQ_migration_special',
      prerequisiteFlows: [],
      prerequisiteArtifacts: [],
      nextFlowsIfSuccess: ['flowJ_tactical_polish'],
      nextFlowsIfIncomplete: [],
    });

    // Tier 5: Specialized Refinement Flows
    // Flow R: Layout Optimization
    this.flowDependencies.set('flowR_layout_optimization', {
      flowId: 'flowR_layout_optimization',
      prerequisiteFlows: ['flowF_design_tokens'],
      prerequisiteArtifacts: ['DESIGN.md'],
      nextFlowsIfSuccess: [],
      nextFlowsIfIncomplete: [],
    });

    // Flow S: Typography Excellence
    this.flowDependencies.set('flowS_typography_excellence', {
      flowId: 'flowS_typography_excellence',
      prerequisiteFlows: ['flowF_design_tokens'],
      prerequisiteArtifacts: ['DESIGN.md'],
      nextFlowsIfSuccess: [],
      nextFlowsIfIncomplete: [],
    });

    // Flow T: Ambitious Motion
    this.flowDependencies.set('flowT_ambitious_motion', {
      flowId: 'flowT_ambitious_motion',
      prerequisiteFlows: ['flowE_motion_patterns', 'flowF_design_tokens'],
      prerequisiteArtifacts: [],
      nextFlowsIfSuccess: [],
      nextFlowsIfIncomplete: [],
    });

    // Flow U: Curate - Design reference capture wizard (independent, no prerequisites)
    this.flowDependencies.set('flowU_curate', {
      flowId: 'flowU_curate',
      prerequisiteFlows: [],
      prerequisiteArtifacts: [],
      nextFlowsIfSuccess: [],
      nextFlowsIfIncomplete: [],
    });

    // Flow V: All-Seven QA - Comprehensive design pipeline verification
    // This flow chains A-T in sequence for end-to-end QA
    this.flowDependencies.set('flowV_all_seven_qa', {
      flowId: 'flowV_all_seven_qa',
      prerequisiteFlows: [],
      // Artifacts validated by DeterministicValidator, not here
      prerequisiteArtifacts: [],
      // Entry point: start the chain with Flow A
      nextFlowsIfSuccess: ['flowA_brand_verify'],
      nextFlowsIfIncomplete: [],
    });
  }

  private initializeFlowChains(): void {
    // Research Phase: A → B → C → D
    this.flowChains.set('research', {
      phase: 'research',
      flows: [
        'flowA_brand_verify',
        'flowB_component_research',
        'flowC_font_research',
        'flowD_reference_inspiration',
      ],
      description: 'Gather brand foundation and design references',
    });

    // Execution Phase: E → F → G → H
    this.flowChains.set('execution', {
      phase: 'execution',
      flows: [
        'flowE_motion_patterns',
        'flowF_design_tokens',
        'flowG_component_implementation',
        'flowH_motion_integration',
      ],
      description: 'Build components and motion from scratch',
    });

    // Polish & QA Phase: I → J
    this.flowChains.set('polish', {
      phase: 'polish',
      flows: ['flowI_accessibility', 'flowJ_tactical_polish'],
      description: 'Validate accessibility and refine feel',
    });

    // Full workflow for build-from-scratch: A → B → C → D → E → F → G → H → I → J
    this.flowChains.set('qa', {
      phase: 'qa',
      flows: [
        'flowA_brand_verify',
        'flowB_component_research',
        'flowC_font_research',
        'flowD_reference_inspiration',
        'flowE_motion_patterns',
        'flowF_design_tokens',
        'flowG_component_implementation',
        'flowH_motion_integration',
        'flowI_accessibility',
        'flowJ_tactical_polish',
      ],
      description: 'Complete design workflow from brand to polish',
    });
  }

  // Detect which design phase the user is in based on context
  detectPhase(context: FlowExecutionContext): DesignPhase {
    const sequence = this.history.getFlowSequence();

    // If we've never run research flows, user is in research phase
    const researchFlows = ['flowA_brand_verify', 'flowB_component_research'];
    const ranResearch = researchFlows.some((f) =>
      sequence.some((h: FlowHistoryEntry) => h.flowId === f)
    );

    if (!ranResearch) return 'research';

    // If research is done but execution hasn't started, still research
    const executionFlows = [
      'flowF_design_tokens',
      'flowG_component_implementation',
    ];
    const ranExecution = executionFlows.some((f) =>
      sequence.some((h: FlowHistoryEntry) => h.flowId === f)
    );

    if (!ranExecution) return 'research';

    // If execution is done but QA/polish hasn't, user is in execution phase
    const qaFlows = ['flowI_accessibility', 'flowJ_tactical_polish'];
    const ranQA = qaFlows.some((f) =>
      sequence.some((h: FlowHistoryEntry) => h.flowId === f)
    );

    if (!ranQA) return 'execution';

    // If all done, user is in polish/refinement phase
    return 'polish';
  }

  // Get recommended flow sequence for current phase
  recommendFlowSequence(phase: DesignPhase): FlowId[] {
    return this.flowChains.get(phase)?.flows || [];
  }

  // Validate prerequisites before running a flow
  validatePrerequisites(
    flowId: FlowId
  ): { valid: boolean; missingArtifacts: string[]; message: string } {
    const dep = this.flowDependencies.get(flowId);
    if (!dep) {
      return {
        valid: false,
        missingArtifacts: [],
        message: `Unknown flow: ${flowId}`,
      };
    }

    // Check if prerequisite flows have been run
    const sequence = this.history.getFlowSequence();
    const missingFlows = dep.prerequisiteFlows.filter(
      (f) =>
        !sequence.some(
          (h: FlowHistoryEntry) => h.flowId === f && h.status === 'success'
        )
    );

    if (missingFlows.length > 0) {
      return {
        valid: false,
        missingArtifacts: missingFlows,
        message: `Missing prerequisites: ${missingFlows.join(', ')}. Run those flows first.`,
      };
    }

    // Check if required artifacts exist (e.g., DESIGN.md)
    // For now, just return valid - artifact checking is done in handlers
    if (dep.prerequisiteArtifacts.length > 0) {
      return {
        valid: true,
        missingArtifacts: dep.prerequisiteArtifacts,
        message: `Optional artifacts for better results: ${dep.prerequisiteArtifacts.join(', ')}`,
      };
    }

    return {
      valid: true,
      missingArtifacts: [],
      message: 'Prerequisites met',
    };
  }

  // Get next recommended flow after current flow completes
  getNextRecommendedFlow(
    currentFlowId: FlowId,
    currentResult: FlowExecutionResult
  ): FlowId | undefined {
    const dep = this.flowDependencies.get(currentFlowId);
    if (!dep) return undefined;

    // If flow succeeded, recommend next flows in execution chain
    if (
      currentResult.status === 'success' &&
      dep.nextFlowsIfSuccess.length > 0
    ) {
      return dep.nextFlowsIfSuccess[0];
    }

    // If flow is incomplete/partial, recommend alternative flows
    if (dep.nextFlowsIfIncomplete.length > 0) {
      return dep.nextFlowsIfIncomplete[0];
    }

    return undefined;
  }

  // Record flow execution for history
  recordFlowExecution(result: FlowExecutionResult): void {
    // Only record flows with final status (skip 'needs_input' which is transient)
    if (result.status === 'needs_input') {
      return;
    }

    this.history.recordFlow({
      flowId: result.flowId,
      flowName: result.flowName,
      status: result.status,
      message: result.message,
      guidance: result.guidance,
      checklist: result.checklist,
      artifacts: result.artifacts,
      error: result.error,
    });
  }

  // Get full design workflow recommendations
  getWorkflowRecommendation(context: FlowExecutionContext): {
    phase: DesignPhase;
    nextFlow: FlowId;
    sequenceProgress: string;
  } {
    const phase = this.detectPhase(context);
    const sequence = this.recommendFlowSequence(phase);
    const history = this.history.getFlowSequence();

    const nextFlow = sequence.find(
      (f) => !history.some((h: FlowHistoryEntry) => h.flowId === f && h.status === 'success')
    );

    const completed = sequence.filter((f) =>
      history.some((h: FlowHistoryEntry) => h.flowId === f && h.status === 'success')
    ).length;

    return {
      phase,
      nextFlow: nextFlow || sequence[sequence.length - 1],
      sequenceProgress: `${completed}/${sequence.length} complete`,
    };
  }
}

export function createOrchestrator(history: FlowHistory): SidecoachOrchestrator {
  return new SidecoachOrchestrator(history);
}
