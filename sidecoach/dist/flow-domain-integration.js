"use strict";
// Flow Domain Integration
// Enables flows to load and apply design domain rules
// Supports Task #2: Extract 7 domain rules into flows
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowDomainIntegrator = void 0;
exports.createDomainIntegrator = createDomainIntegrator;
exports.shouldApplyDomain = shouldApplyDomain;
const flow_domain_mapping_1 = require("./flow-domain-mapping");
const design_laws_1 = require("./design-laws");
class FlowDomainIntegrator {
    constructor(flowId, context) {
        this.flowId = flowId;
        this.context = context;
    }
    getDomainIntegrationContext() {
        const domains = (0, flow_domain_mapping_1.getDomainsForFlow)(this.flowId);
        const domainRules = {};
        const checkpoints = [];
        for (const domain of domains) {
            const laws = (0, design_laws_1.getSharedLawsForDomain)(domain);
            if (laws) {
                domainRules[domain] = laws.rules;
            }
            checkpoints.push(...(0, flow_domain_mapping_1.getValidationPointsForDomain)(domain));
        }
        return {
            flowId: this.flowId,
            domains,
            domainRules,
            validationCheckpoints: checkpoints,
            register: this.context.metadata?.register || null,
        };
    }
    validateDomains() {
        const context = this.getDomainIntegrationContext();
        const results = [];
        for (const domain of context.domains) {
            const rules = context.domainRules[domain] || [];
            const checkpoints = (0, flow_domain_mapping_1.getValidationPointsForDomain)(domain);
            results.push({
                domain,
                ruleCount: rules.length,
                rules,
                checkpointsApplied: checkpoints,
            });
        }
        return results;
    }
    applyDomainRulesToResult(result) {
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
    enrichContextWithDomains() {
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
exports.FlowDomainIntegrator = FlowDomainIntegrator;
function createDomainIntegrator(flowId, context) {
    return new FlowDomainIntegrator(flowId, context);
}
function shouldApplyDomain(flowId, domain, isPrimary = false) {
    const domains = (0, flow_domain_mapping_1.getDomainsForFlow)(flowId);
    return domains.includes(domain);
}
//# sourceMappingURL=flow-domain-integration.js.map