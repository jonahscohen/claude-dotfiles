export interface ProjectPersona {
    name: string;
    role: string;
    goals: string[];
    frustrations: string[];
    techComfort: 'high' | 'medium' | 'low';
    accessibilityNeeds: string[];
    testingFocus: string;
}
export declare class ProjectPersonaEngine {
    private client;
    constructor();
    /**
     * Extract 3 project-specific personas from freeform PRODUCT.md
     * Async - uses Claude to parse unstructured content
     * Fallback to generic personas if extraction fails
     */
    generate(productMdContent: string): Promise<ProjectPersona[]>;
    /**
     * Convert personas into a critique prompt for design review
     */
    toCritiquePrompt(personas: ProjectPersona[]): string;
}
export declare function createPersonaEngine(): ProjectPersonaEngine;
//# sourceMappingURL=persona-engine.d.ts.map