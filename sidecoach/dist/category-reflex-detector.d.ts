export interface DesignReference {
    title: string;
    category: string;
    description: string;
    colorPalette?: string[];
    spacingPattern?: string;
    typographyApproach?: string;
    interactionPattern?: string;
    imageUrl?: string;
    sourceUrl?: string;
}
export interface SlopDetectionResult {
    reference: DesignReference;
    genericityScore: number;
    oversaturatedPatterns: string[];
    isSlop: boolean;
    verdict: 'keep' | 'flag' | 'discard';
    confidence: number;
    reasoning: string;
}
export declare class CategoryReflexDetector {
    /**
     * Detect if a design reference contains oversaturated/generic patterns
     * Returns genericityScore (0-100) and categorization
     */
    detectSlop(reference: DesignReference): SlopDetectionResult;
    /**
     * Batch detect slop in multiple references
     * Returns results sorted by genericityScore (lowest/best first)
     */
    detectBatch(references: DesignReference[]): SlopDetectionResult[];
    /**
     * Filter references, removing oversaturated patterns
     * Threshold: genericityScore >= 70 = discard
     */
    filterQualityReferences(references: DesignReference[], threshold?: number): DesignReference[];
    /**
     * Get category-specific reflex data (oversaturated patterns in a category)
     */
    getCategoryReflex(category: string): string[];
    /**
     * Analyze why a reference is generic (detailed report)
     */
    analyzeGenericity(reference: DesignReference): {
        score: number;
        factors: string[];
        suggestions: string[];
    };
    private matchPatternSignature;
    private analyzeDescriptionGenericity;
    private determineVerdict;
    private generateReasoning;
    private getSuggestionForPattern;
}
export declare function createCategoryReflexDetector(): CategoryReflexDetector;
//# sourceMappingURL=category-reflex-detector.d.ts.map