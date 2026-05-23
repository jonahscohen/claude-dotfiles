// Flow Domain Integration
// Enables flows to load and apply design domain rules
// Supports Task #2: Extract 7 domain rules into flows

import { FlowId } from './types';
import { FlowExecutionContext, FlowExecutionResult } from './flow-handler';
import { getDomainsForFlow, getValidationPointsForDomain } from './flow-domain-mapping';
import { SHARED_DESIGN_LAWS, getSharedLawsForDomain, ANTI_PATTERNS } from './design-laws';
import { ProjectContext } from './context-loader';

export interface DomainIntegrationContext {
  flowId: FlowId;
  domains: string[];
  domainRules: Record<string, string[]>;
  validationCheckpoints: string[];
  register: 'brand' | 'product' | null;
}

export interface DomainValidationResult {
  domain: string;
  ruleCount: number;
  rules: string[];
  checkpointsApplied: string[];
}

export class FlowDomainIntegrator {
  private flowId: FlowId;
  private context: Partial<FlowExecutionContext>;

  constructor(flowId: FlowId, context: Partial<FlowExecutionContext>) {
    this.flowId = flowId;
    this.context = context;
  }

  getDomainIntegrationContext(): DomainIntegrationContext {
    const domains = getDomainsForFlow(this.flowId);
    const domainRules: Record<string, string[]> = {};
    const checkpoints: string[] = [];

    for (const domain of domains) {
      const laws = getSharedLawsForDomain(domain);
      if (laws) {
        domainRules[domain] = laws.rules;
      }
      checkpoints.push(...getValidationPointsForDomain(domain));
    }

    return {
      flowId: this.flowId,
      domains,
      domainRules,
      validationCheckpoints: checkpoints,
      register: (this.context.metadata?.register as 'brand' | 'product') || null,
    };
  }

  validateDomains(): DomainValidationResult[] {
    const context = this.getDomainIntegrationContext();
    const results: DomainValidationResult[] = [];

    for (const domain of context.domains) {
      const rules = context.domainRules[domain] || [];
      const checkpoints = getValidationPointsForDomain(domain);

      results.push({
        domain,
        ruleCount: rules.length,
        rules,
        checkpointsApplied: checkpoints,
      });
    }

    return results;
  }

  applyDomainRulesToResult(result: FlowExecutionResult): FlowExecutionResult {
    const validations = this.validateDomains();
    const totalRules = validations.reduce((sum, v) => sum + v.ruleCount, 0);

    return {
      ...result,
      executionMetadata: {
        ...(result.executionMetadata || {}),
        enhancedContext: {
          ...(result.executionMetadata?.enhancedContext || {}),
          domainValidations: validations,
          domainsApplied: validations.map(v => v.domain),
          totalRulesApplied: totalRules,
        },
      },
    };
  }

  enrichContextWithDomains(): Partial<FlowExecutionContext> {
    const context = this.getDomainIntegrationContext();
    const totalRules = Object.values(context.domainRules).reduce((sum, rules) => sum + rules.length, 0);

    return {
      ...this.context,
      metadata: {
        ...(this.context.metadata || {}),
        flowDomains: context.domains,
        domainValidationCheckpoints: context.validationCheckpoints,
        designRulesApplied: totalRules,
      },
    };
  }
}

export function createDomainIntegrator(
  flowId: FlowId,
  context: Partial<FlowExecutionContext>
): FlowDomainIntegrator {
  return new FlowDomainIntegrator(flowId, context);
}

export function shouldApplyDomain(
  flowId: FlowId,
  domain: string,
  isPrimary: boolean = false
): boolean {
  const domains = getDomainsForFlow(flowId);
  return domains.includes(domain);
}
