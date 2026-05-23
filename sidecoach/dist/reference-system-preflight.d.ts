import { ComponentGalleryReference, FontshareReference, DesignReferencesSystem, MotionReference, ReferenceSystemsFactory } from './reference-systems';
export interface ReferenceSystemHealth {
    systemName: string;
    isAvailable: boolean;
    reason?: string;
    fallbackActive: boolean;
    lastCheckMs: number;
}
export interface PreFlightResult {
    allHealthy: boolean;
    systems: ReferenceSystemHealth[];
    warnings: string[];
}
export declare class ReferenceSystemPreFlight {
    private factory;
    private dataService;
    private healthCache;
    private readonly HEALTH_CHECK_INTERVAL_MS;
    private readonly TIMEOUT_MS;
    constructor(factory: ReferenceSystemsFactory);
    /**
     * Run pre-flight checks on all reference systems
     * Returns immediate status without blocking on slow systems
     */
    runPreFlight(): Promise<PreFlightResult>;
    /**
     * Check health of a single reference system with caching
     */
    checkSystemHealth(systemName: string): Promise<ReferenceSystemHealth>;
    /**
     * Get reference system with automatic fallback
     * Returns production system or cached fallback depending on health
     */
    getComponentGalleryWithFallback(): Promise<ComponentGalleryReference>;
    getFontshareWithFallback(): Promise<FontshareReference>;
    getDesignReferencesWithFallback(): Promise<DesignReferencesSystem>;
    getMotionReferenceWithFallback(): Promise<MotionReference>;
    private checkComponentGalleryHealth;
    private checkFontshareHealth;
    private checkDesignReferencesHealth;
    private checkMotionPatternsHealth;
    clearCache(): void;
}
export declare function createReferenceSystemPreFlight(factory: ReferenceSystemsFactory): ReferenceSystemPreFlight;
//# sourceMappingURL=reference-system-preflight.d.ts.map