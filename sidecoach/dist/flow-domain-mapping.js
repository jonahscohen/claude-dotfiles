"use strict";
// Domain-Flow Mapping Matrix
// Maps design domains to flows and validation checkpoints
// Used by Task #2 (extract domain rules) and Task #17 (mapping matrix)
Object.defineProperty(exports, "__esModule", { value: true });
exports.FLOW_DOMAIN_MATRIX = exports.DOMAIN_FLOW_MAP = void 0;
exports.getDomainsForFlow = getDomainsForFlow;
exports.getPrimaryDomainsForFlow = getPrimaryDomainsForFlow;
exports.getFlowsForDomain = getFlowsForDomain;
exports.getValidationPointsForDomain = getValidationPointsForDomain;
exports.DOMAIN_FLOW_MAP = [
    {
        domain: 'typography',
        description: 'Font pairing, modular scales, line length, hierarchy, weight contrast',
        flowIds: [
            'flowA_brand_verify',
            'flowC_font_research',
            'flowG_component_implementation',
            'flowJ_tactical_polish',
            'flowS_typography_excellence',
        ],
        validationPoints: [
            'Line length 65-75ch check',
            'Hierarchy scale ratio >= 1.25',
            'No flat scales',
            'Weight contrast >= 2 steps',
        ],
        severity: 'high',
    },
    {
        domain: 'color',
        description: 'OKLCH strategy, tinted neutrals, dark mode, WCAG contrast, color commitment levels',
        flowIds: [
            'flowA_brand_verify',
            'flowD_reference_inspiration',
            'flowF_design_tokens',
            'flowG_component_implementation',
            'flowI_accessibility',
            'flowJ_tactical_polish',
        ],
        validationPoints: [
            'OKLCH color space validation',
            'No pure black (#000) or white (#fff)',
            'WCAG 2.1 AA contrast (4.5:1 text, 3:1 UI)',
            'Color strategy defined (restrained/committed/full/drenched)',
        ],
        severity: 'critical',
    },
    {
        domain: 'spatial',
        description: 'Spacing systems, grids, visual rhythm, nesting, containers',
        flowIds: [
            'flowA_brand_verify',
            'flowB_component_research',
            'flowD_reference_inspiration',
            'flowF_design_tokens',
            'flowG_component_implementation',
            'flowJ_tactical_polish',
            'flowR_layout_optimization',
        ],
        validationPoints: [
            'Spacing rhythm (not all same padding)',
            'No lazy card patterns',
            'Containers used intentionally',
            'Semantic grid systems',
        ],
        severity: 'high',
    },
    {
        domain: 'motion',
        description: 'Easing curves (exponential only), staggering, reduced motion support',
        flowIds: [
            'flowE_motion_patterns',
            'flowH_motion_integration',
            'flowJ_tactical_polish',
            'flowT_ambitious_motion',
        ],
        validationPoints: [
            'Exponential easing only (ease-out-quart/quint/expo)',
            'No bounce or elastic easing',
            'No layout animation',
            'prefers-reduced-motion respected',
        ],
        severity: 'high',
    },
    {
        domain: 'interaction',
        description: 'Form states, focus management, loading patterns, affordances',
        flowIds: [
            'flowB_component_research',
            'flowG_component_implementation',
            'flowH_motion_integration',
            'flowI_accessibility',
            'flowJ_tactical_polish',
        ],
        validationPoints: [
            'Hit areas 40x40px minimum',
            'Focus state visible (keyboard navigation)',
            'Loading states clear',
            'Error messages specific and actionable',
        ],
        severity: 'critical',
    },
    {
        domain: 'responsive',
        description: 'Mobile-first, fluid design, container queries, breakpoints',
        flowIds: [
            'flowB_component_research',
            'flowG_component_implementation',
            'flowI_accessibility',
            'flowJ_tactical_polish',
            'flowM_responsive_validation',
        ],
        validationPoints: [
            'Mobile-first approach',
            'Fluid sizing and container queries',
            'Touch targets 44x44px minimum',
            'Text overflow handled',
        ],
        severity: 'high',
    },
    {
        domain: 'uxWriting',
        description: 'Button labels, error messages, empty states, microcopy',
        flowIds: [
            'flowG_component_implementation',
            'flowI_accessibility',
            'flowJ_tactical_polish',
        ],
        validationPoints: [
            'Every word earns its place',
            'No em dashes',
            'Button labels action-oriented',
            'Microcopy serves user',
        ],
        severity: 'medium',
    },
];
exports.FLOW_DOMAIN_MATRIX = [
    {
        flowId: 'flowA_brand_verify',
        flowName: 'Brand Verification',
        domains: ['typography', 'color', 'spatial'],
        primaryDomains: ['typography', 'color'],
        optionalDomains: ['spatial'],
    },
    {
        flowId: 'flowB_component_research',
        flowName: 'Component Research',
        domains: ['interaction', 'responsive', 'spatial'],
        primaryDomains: ['interaction'],
        optionalDomains: ['responsive', 'spatial'],
    },
    {
        flowId: 'flowC_font_research',
        flowName: 'Font Research',
        domains: ['typography'],
        primaryDomains: ['typography'],
        optionalDomains: [],
    },
    {
        flowId: 'flowD_reference_inspiration',
        flowName: 'Design References',
        domains: ['color', 'spatial'],
        primaryDomains: ['color', 'spatial'],
        optionalDomains: [],
    },
    {
        flowId: 'flowE_motion_patterns',
        flowName: 'Motion Patterns',
        domains: ['motion'],
        primaryDomains: ['motion'],
        optionalDomains: [],
    },
    {
        flowId: 'flowF_design_tokens',
        flowName: 'Design Tokens',
        domains: ['typography', 'color', 'spatial', 'motion'],
        primaryDomains: ['color', 'spatial'],
        optionalDomains: ['typography', 'motion'],
    },
    {
        flowId: 'flowG_component_implementation',
        flowName: 'Component Implementation',
        domains: ['typography', 'color', 'spatial', 'interaction', 'responsive', 'uxWriting'],
        primaryDomains: ['typography', 'color', 'spatial', 'interaction'],
        optionalDomains: ['responsive', 'uxWriting'],
    },
    {
        flowId: 'flowH_motion_integration',
        flowName: 'Motion Integration',
        domains: ['motion', 'interaction'],
        primaryDomains: ['motion'],
        optionalDomains: ['interaction'],
    },
    {
        flowId: 'flowI_accessibility',
        flowName: 'Accessibility Audit',
        domains: ['color', 'interaction', 'responsive'],
        primaryDomains: ['color', 'interaction', 'responsive'],
        optionalDomains: [],
    },
    {
        flowId: 'flowJ_tactical_polish',
        flowName: 'Tactical Polish',
        domains: ['typography', 'color', 'spatial', 'motion', 'interaction', 'responsive', 'uxWriting'],
        primaryDomains: ['typography', 'color', 'spatial'],
        optionalDomains: ['motion', 'interaction', 'responsive', 'uxWriting'],
    },
];
function getDomainsForFlow(flowId) {
    const requirement = exports.FLOW_DOMAIN_MATRIX.find(f => f.flowId === flowId);
    return requirement?.domains || [];
}
function getPrimaryDomainsForFlow(flowId) {
    const requirement = exports.FLOW_DOMAIN_MATRIX.find(f => f.flowId === flowId);
    return requirement?.primaryDomains || [];
}
function getFlowsForDomain(domain) {
    const mapping = exports.DOMAIN_FLOW_MAP.find(d => d.domain === domain);
    return mapping?.flowIds || [];
}
function getValidationPointsForDomain(domain) {
    const mapping = exports.DOMAIN_FLOW_MAP.find(d => d.domain === domain);
    return mapping?.validationPoints || [];
}
//# sourceMappingURL=flow-domain-mapping.js.map