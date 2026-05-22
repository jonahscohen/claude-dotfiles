import { BaseFlowHandler, FlowExecutionContext, FlowExecutionResult } from './flow-handler';
/**
 * Flow A: Brand/PRODUCT.md Verification
 * Verify project has valid brand register before design work
 */
export declare class FlowABrandVerifyHandler extends BaseFlowHandler {
    constructor();
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
/**
 * Flow B: Component Research (component.gallery)
 * Research component patterns and implementations (60 types, 95 systems)
 */
export declare class FlowBComponentResearchHandler extends BaseFlowHandler {
    private refData;
    constructor();
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
/**
 * Flow C: Font Research (fontshare.com)
 * Research typefaces and pairing against brand personality
 */
export declare class FlowCFontResearchHandler extends BaseFlowHandler {
    private refData;
    constructor();
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
/**
 * Flow D: Reference/Inspiration Search (design-references)
 * Search personal design reference catalog for patterns and inspiration
 */
export declare class FlowDReferenceSearchHandler extends BaseFlowHandler {
    private refData;
    constructor();
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
/**
 * Flow E: Motion Pattern Library (GSAP/Lenis)
 * Research motion patterns and animation techniques
 */
export declare class FlowEMotionPatternsHandler extends BaseFlowHandler {
    private refData;
    constructor();
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
/**
 * Flow F: Design System Tokens (DESIGN.md)
 * Full DESIGN.md workflow - extract, manage, lint tokens (google-labs-code spec)
 */
export declare class FlowFDesignTokensHandler extends BaseFlowHandler {
    private refData;
    constructor();
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
/**
 * Flow G: Component Implementation
 * Map design spec to implementation, wire variants, states, responsive behavior
 */
export declare class FlowGComponentImplementationHandler extends BaseFlowHandler {
    private refData;
    constructor();
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
/**
 * Flow H: Motion Integration (GSAP/Lenis)
 * Implement production-ready motion - tweens, ScrollTrigger, Flip, SplitText, DrawSVG
 */
export declare class FlowHMotionIntegrationHandler extends BaseFlowHandler {
    private refData;
    constructor();
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
/**
 * Flow I: Accessibility Compliance (WCAG 2.1 AA)
 * WCAG 2.1 AA validation, screen reader testing, severity prioritization
 */
export declare class FlowIAccessibilityHandler extends BaseFlowHandler {
    constructor();
    execute(context: FlowExecutionContext): Promise<FlowExecutionResult>;
}
//# sourceMappingURL=flow-handlers-new-tiers.d.ts.map