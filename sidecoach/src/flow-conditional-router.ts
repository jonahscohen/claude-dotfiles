// Phase III Block 3: Conditional Execution Engine
// Route flows based on project state, intent, prerequisites, and feature availability

import { FlowExecutionContext } from './flow-handler';
import { FlowId } from './types';
import { getFlowHistory } from './flow-history';

export interface ExecutionCondition {
  name: string;
  description: string;
  evaluate: (context: FlowExecutionContext) => boolean;
}

export interface ConditionalFlowRoute {
  flowId: FlowId;
  conditions: ExecutionCondition[];
  skipIfConditionFails: boolean;
  alternativeFlow?: FlowId;
}

export class FlowConditionalRouter {
  // Project state conditions
  static hasDesignTokens(context: FlowExecutionContext): boolean {
    return !!(context.metadata?.designTokens && Object.keys(context.metadata.designTokens).length > 0);
  }

  static hasComponentLibrary(context: FlowExecutionContext): boolean {
    return !!(context.metadata?.componentTree && context.metadata.componentTree.nodeCount > 0);
  }

  static hasColorSystem(context: FlowExecutionContext): boolean {
    return !!(context.metadata?.colors && Object.keys(context.metadata.colors).length > 0);
  }

  static hasTypographySystem(context: FlowExecutionContext): boolean {
    return !!(context.metadata?.typography && Object.keys(context.metadata.typography).length > 0);
  }

  static hasSpacingSystem(context: FlowExecutionContext): boolean {
    return !!(context.metadata?.spacing && Object.keys(context.metadata.spacing).length > 0);
  }

  static hasAccessibilityChecks(context: FlowExecutionContext): boolean {
    return !!(context.metadata?.accessibility && Object.keys(context.metadata.accessibility).length > 0);
  }

  // Intent-based conditions
  static isResearchPhase(context: FlowExecutionContext): boolean {
    const utterance = (context.utterance || '').toLowerCase();
    return utterance.includes('research') || utterance.includes('explore') || utterance.includes('investigate');
  }

  static isImplementationPhase(context: FlowExecutionContext): boolean {
    const utterance = (context.utterance || '').toLowerCase();
    return utterance.includes('implement') || utterance.includes('build') || utterance.includes('code');
  }

  static isQAPhase(context: FlowExecutionContext): boolean {
    const utterance = (context.utterance || '').toLowerCase();
    return utterance.includes('qa') || utterance.includes('test') || utterance.includes('audit') || utterance.includes('verify');
  }

  // Prerequisite conditions
  static flowHasExecuted(context: FlowExecutionContext, flowId: FlowId): boolean {
    const flowHistory = getFlowHistory();
    const sequence = flowHistory.getFlowSequence();
    return sequence.some(entry => entry.flowId === flowId && entry.status === 'success');
  }

  static allPrerequisitesComplete(context: FlowExecutionContext, prerequisites: FlowId[]): boolean {
    return prerequisites.every(flowId => this.flowHasExecuted(context, flowId));
  }

  // Feature availability conditions
  static hasEndowTool(context: FlowExecutionContext): boolean {
    // Check if endow is available in metadata or environment
    return !!(context.metadata?.endowAvailable !== false);
  }

  static hasFigmaAccess(context: FlowExecutionContext): boolean {
    // Check if Figma integration is available
    return !!(context.metadata?.figmaAvailable !== false);
  }

  static canAccessComponentGallery(context: FlowExecutionContext): boolean {
    // Check if component gallery reference system is available
    return !!(context.metadata?.componentGalleryAvailable !== false);
  }

  // Route determination logic
  static determineRoute(context: FlowExecutionContext): FlowId | null {
    const utterance = (context.utterance || '').toLowerCase();

    // Research flows - require no prior work
    if (utterance.includes('brand') && !this.flowHasExecuted(context, 'flowA_brand_verify')) {
      return 'flowA_brand_verify' as FlowId;
    }

    if (utterance.includes('component') && utterance.includes('research') && !this.flowHasExecuted(context, 'flowB_component_research')) {
      return 'flowB_component_research' as FlowId;
    }

    if (utterance.includes('font') && !this.flowHasExecuted(context, 'flowC_font_research')) {
      return 'flowC_font_research' as FlowId;
    }

    if (utterance.includes('reference') && !this.flowHasExecuted(context, 'flowD_reference_inspiration')) {
      return 'flowD_reference_inspiration' as FlowId;
    }

    if (utterance.includes('motion') && !this.flowHasExecuted(context, 'flowE_motion_patterns')) {
      return 'flowE_motion_patterns' as FlowId;
    }

    // Implementation flows - require design tokens
    if (utterance.includes('tokens') && this.hasDesignTokens(context)) {
      return 'flowF_design_tokens' as FlowId;
    }

    if (utterance.includes('component') && utterance.includes('implement') && this.hasDesignTokens(context)) {
      return 'flowG_component_implementation' as FlowId;
    }

    if (utterance.includes('motion') && utterance.includes('integrat') && this.hasDesignTokens(context)) {
      return 'flowH_motion_integration' as FlowId;
    }

    if (utterance.includes('access') && utterance.includes('wcag')) {
      return 'flowI_accessibility' as FlowId;
    }

    // Polish flows - require implementation
    if (utterance.includes('polish') && this.hasComponentLibrary(context)) {
      return 'flowJ_tactical_polish' as FlowId;
    }

    if (utterance.includes('audit') && this.hasComponentLibrary(context)) {
      return 'flowK_multi_lens_audit' as FlowId;
    }

    if (utterance.includes('critique') && this.hasComponentLibrary(context)) {
      return 'flowL_design_critique' as FlowId;
    }

    if (utterance.includes('responsive') && this.hasComponentLibrary(context)) {
      return 'flowM_responsive_validation' as FlowId;
    }

    // QA and optimization
    if (utterance.includes('all-seven') || utterance.includes('comprehensive')) {
      return 'flowV_all_seven_qa' as FlowId;
    }

    return null;
  }

  static buildConditionalRoutes(): ConditionalFlowRoute[] {
    return [
      // Flow A: Brand Verify - no prerequisites
      {
        flowId: 'flowA_brand_verify' as FlowId,
        conditions: [],
        skipIfConditionFails: false,
      },

      // Flow F: Design Tokens - requires Flow A (brand)
      {
        flowId: 'flowF_design_tokens' as FlowId,
        conditions: [
          {
            name: 'brand-verified',
            description: 'Brand verification must be complete',
            evaluate: (context) => this.flowHasExecuted(context, 'flowA_brand_verify'),
          },
        ],
        skipIfConditionFails: false,
        alternativeFlow: 'flowA_brand_verify' as FlowId,
      },

      // Flow G: Component Implementation - requires Design Tokens (Flow F)
      {
        flowId: 'flowG_component_implementation' as FlowId,
        conditions: [
          {
            name: 'design-tokens-ready',
            description: 'Design tokens must be defined',
            evaluate: (context) => this.flowHasExecuted(context, 'flowF_design_tokens'),
          },
        ],
        skipIfConditionFails: true,
        alternativeFlow: 'flowF_design_tokens' as FlowId,
      },

      // Flow J: Tactical Polish - requires components (Flow G)
      {
        flowId: 'flowJ_tactical_polish' as FlowId,
        conditions: [
          {
            name: 'components-exist',
            description: 'Components must be implemented',
            evaluate: (context) => this.flowHasExecuted(context, 'flowG_component_implementation'),
          },
        ],
        skipIfConditionFails: true,
      },

      // Flow V: All-Seven QA - requires all core implementations
      {
        flowId: 'flowV_all_seven_qa' as FlowId,
        conditions: [
          {
            name: 'brand-verified',
            description: 'Brand must be verified',
            evaluate: (context) => this.flowHasExecuted(context, 'flowA_brand_verify'),
          },
          {
            name: 'design-tokens-ready',
            description: 'Design tokens must exist',
            evaluate: (context) => this.flowHasExecuted(context, 'flowF_design_tokens'),
          },
          {
            name: 'components-implemented',
            description: 'Components must be implemented',
            evaluate: (context) => this.flowHasExecuted(context, 'flowG_component_implementation'),
          },
        ],
        skipIfConditionFails: true,
      },
    ];
  }

  static evaluateRouteConditions(context: FlowExecutionContext, route: ConditionalFlowRoute): boolean {
    if (route.conditions.length === 0) {
      return true; // No conditions = always executable
    }

    return route.conditions.every(condition => condition.evaluate(context));
  }

  static getExecutablePath(context: FlowExecutionContext): FlowId[] {
    const path: FlowId[] = [];
    const routes = this.buildConditionalRoutes();
    const utterance = (context.utterance || '').toLowerCase();

    // Start with the primary flow
    const primaryFlow = this.determineRoute(context);
    if (!primaryFlow) {
      return path;
    }

    path.push(primaryFlow);

    // Find the route and check conditions
    const route = routes.find(r => r.flowId === primaryFlow);
    if (route) {
      const canExecute = this.evaluateRouteConditions(context, route);
      if (!canExecute && route.alternativeFlow) {
        // Replace with alternative flow
        path[path.length - 1] = route.alternativeFlow;
      }
    }

    return path;
  }
}

export function determineConditionalFlow(context: FlowExecutionContext): FlowId | null {
  return FlowConditionalRouter.determineRoute(context);
}

export function getExecutablePath(context: FlowExecutionContext): FlowId[] {
  return FlowConditionalRouter.getExecutablePath(context);
}
